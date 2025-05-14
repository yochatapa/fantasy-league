import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'
import { encryptData, decryptData } from '../../utils/crypto.js';

import path from 'path';
import { saveUploadedFile, deleteFile } from '../../utils/fileUploader.js';
import { v4 as uuidv4 } from 'uuid';
import { rootCertificates } from 'tls';
import convertFileToBase64 from '../../utils/convertFileToBase64.js'; // apiResponse에서 임포트

const finalUploadsBaseDir = path.join(process.cwd(), 'uploads');

export const getTeamRosterList = async (req, res) => {
    try {
        let { date, teamId, page, limit = 10 } = req.query;

        const queryParams = [];
        let whereClauses = [];

        // 날짜 필터
        if (date) {
            queryParams.push(date);
            whereClauses.push(`
                ktr.joined_date <= $${queryParams.length}
                AND (ktr.left_date IS NULL OR ktr.left_date >= $${queryParams.length})
            `);

            queryParams.push(date.toString().substring(0,4));
            whereClauses.push(`ktr.season_year = $${queryParams.length} `);
        }

        if(teamId){
            queryParams.push(teamId);
            whereClauses.push(`ktr.team_id = $${queryParams.length} `);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 페이지네이션
        let paginationClause = '';
        let paginationParams = [];
        if (page) {
            page = Math.max(1, parseInt(page, 10));
            limit = Math.max(1, parseInt(limit, 10));
            const offset = (page - 1) * limit;
            paginationParams = [limit, offset];
            paginationClause = `LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        }
        // 조회 쿼리
        const rosterList = await query(`
            SELECT
                (ROW_NUMBER() OVER (ORDER BY ktr.season_year, ktr.joined_date)) AS row_number,
                ktr.id as roster_id,
                ktr.team_id,
                ktm.name as team_name,
                ktr.player_id,
                kpm.name as player_name,
                ktr.season_year,
                TO_CHAR(ktr.joined_date, 'YYYY.MM.DD') as joined_date,
                TO_CHAR(ktr.left_date, 'YYYY.MM.DD') as left_date,
                ktr.created_at,
                ktr.updated_at,
                kps.uniform_number,
                ft.file_id,
                ft.sn,
                ft.original_name,
                ft.size,
                ft.path,
                ft.mimetype
            FROM kbo_team_roster ktr
            LEFT JOIN kbo_team_master ktm ON ktm.id = ktr.team_id
            LEFT JOIN kbo_player_master kpm ON kpm.id = ktr.player_id
            LEFT JOIN file_table ft ON ft.file_id = kpm.main_profile_image::uuid AND ft.sn = 1
            LEFT JOIN kbo_player_season kps ON ktr.player_id = kps.player_id and kps.year = ktr.season_year
            ${whereClause}
            ORDER BY ktr.season_year, ktr.joined_date
            ${paginationClause}
        `, [...queryParams, ...paginationParams]);

        // 총 개수 조회
        let total = null;
        if (page) {
            const countResult = await query(`
                SELECT COUNT(*) AS total
                FROM kbo_team_roster ktr
                ${whereClause}
            `, queryParams);
            total = parseInt(countResult.rows[0].total, 10);
        }

        // 이미지 base64 변환
        for (let roster of rosterList.rows) {
            if (roster.path) {
                const filePath = path.join(process.cwd(), roster.path);
                roster.path = await convertFileToBase64(filePath, roster.mimetype);
            }
        }

        return sendSuccess(res, {
            message: "로스터 목록을 성공적으로 조회하였습니다.",
            rosterList: rosterList.rows,
            ...(page ? { total } : {})
        });
    } catch (error) {
        return sendServerError(res, error, '로스터 목록 조회 중 문제가 발생하였습니다. 다시 시도해주세요.');
    }
};


export const createTeamRoster = async (req, res) => {
    const { 
        playerId, joinedDate, leftDate, teamId, seasonYear
    } = req.body;

    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let user;
    try {
        user = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (err) {
        return sendBadRequest(res, '유효하지 않은 토큰입니다.');
    }
    
    // 필수값 검증
    if (!playerId || !joinedDate || !teamId || !seasonYear) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            // 로스터 마스터 테이블 저장
            const insertRosterQuery = `
                INSERT INTO kbo_team_roster (
                    team_id , player_id, season_year, joined_date , left_date 
                    , created_at
                ) VALUES ($1, $2, $3, $4, $5, 
                    CURRENT_TIMESTAMP)
                RETURNING id
            `;
            const { rows } = await client.query(insertRosterQuery, [
                teamId , playerId, seasonYear, joinedDate , leftDate || null
            ]);

            const rosterId = rows[0].id;

            return sendSuccess(res, {
                message: "로스터가 성공적으로 생성되었습니다.",
                rosterId
            });
        });
    } catch (error) {
        return sendServerError(res, error, "로스터 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const getTeamRosterDetail = async (req, res) => {
    let { teamId } = req.params;

    let { date } = req.query;

    if (!teamId) {
        return sendBadRequest(res, "로스터 정보가 잘못되었습니다.");
    }

    if(!date){
        const newDate = new Date();
        date = newDate.getUTCFullYear() + "."
                + (newDate.getMonth + 1) + "."
                + newDate.getDay();
    }

    try {
        // 조회 쿼리
        const { rows : rosterInfo } = await query(`
            SELECT
                (ROW_NUMBER() OVER (ORDER BY ktr.season_year, ktr.joined_date)) AS row_number,
                ktr.id as roster_id,
                ktr.team_id,
                ktm.name as team_name,
                ktr.player_id,
                kpm.name as player_name,
                ktr.season_year,
                TO_CHAR(ktr.joined_date, 'YYYY.MM.DD') as joined_date,
                TO_CHAR(ktr.left_date, 'YYYY.MM.DD') as left_date,
                ktr.created_at,
                ktr.updated_at,
                kps.uniform_number,
                kpm.primary_position,
                ft.file_id,
                ft.sn,
                ft.original_name,
                ft.size,
                ft.path,
                ft.mimetype
            FROM kbo_team_roster ktr
                LEFT JOIN kbo_team_master ktm ON ktm.id = ktr.team_id
                LEFT JOIN kbo_player_master kpm ON kpm.id = ktr.player_id
                LEFT JOIN file_table ft ON ft.file_id = kpm.main_profile_image::uuid AND ft.sn = 1
                LEFT JOIN kbo_player_season kps ON ktr.player_id = kps.player_id and kps.year = ktr.season_year
            WHERE ktr.team_id = $1
                AND ktr.joined_date <= $2
                AND COALESCE(ktr.left_date,null) IS NULL
            ORDER BY ktr.season_year, ktr.joined_date
        `, [teamId, date]);

        // 이미지 base64 변환
        for (let roster of rosterInfo) {
            if (roster.path) {
                const filePath = path.join(process.cwd(), roster.path);
                roster.path = await convertFileToBase64(filePath, roster.mimetype);
            }
        }        

        // 최종 응답 구성
        return sendSuccess(res, {
            message: '로스터 정보가 조회되었습니다.',
            rosterInfo
        });

    } catch (error) {
        console.error('로스터 정보 조회 오류:', error);
        return sendServerError(res, error, '로스터 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

export const deleteTeamRoster = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let { rosterId } = req.body;
    if (!rosterId) {
        return sendBadRequest(res, "삭제할 로스터가 없습니다.");
    }

    try {
        const user = jwt.verify(accessToken, process.env.JWT_SECRET);

        await withTransaction(async (client) => {
            // **게임 존재 여부 확인**
            const { rows: rosterRows } = await client.query(
                'SELECT * FROM kbo_team_roster WHERE id = $1',
                [rosterId]
            );

            if (rosterRows.length === 0) {
                return sendBadRequest(res, "존재하지 않는 로스터입니다.");
            }

            // ** 로스터 정보 삭제**
            await client.query(
                'DELETE FROM kbo_team_roster WHERE id = $1',
                [rosterId]
            );

            return sendSuccess(res, "로스터가 성공적으로 삭제되었습니다.");
        });
    } catch (error) {
        console.error('로스터 삭제 중 오류 발생:', error);
        return sendServerError(res, error, "로스터 삭제 중 오류가 발생했습니다.");
    }
};

export const deactiveTeamRoster = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let { rosterId, leftDate } = req.body;
    if (!rosterId || !leftDate) {
        return sendBadRequest(res, "말소할 로스터가 없습니다.");
    }

    try {
        const user = jwt.verify(accessToken, process.env.JWT_SECRET);

        await withTransaction(async (client) => {
            // **로스터 존재 여부 확인**
            const { rows: rosterRows } = await client.query(
                'SELECT * FROM kbo_team_roster WHERE id = $1',
                [rosterId]
            );

            if (rosterRows.length === 0) {
                return sendBadRequest(res, "존재하지 않는 로스터입니다.");
            }

            // ** 로스터 정보 삭제**
            await client.query(
                'UPDATE kbo_team_roster SET left_date = $2 WHERE id = $1',
                [rosterId, leftDate]
            );

            return sendSuccess(res, "로스터가 성공적으로 삭제되었습니다.");
        });
    } catch (error) {
        console.error('로스터 삭제 중 오류 발생:', error);
        return sendServerError(res, error, "로스터 삭제 중 오류가 발생했습니다.");
    }
};
