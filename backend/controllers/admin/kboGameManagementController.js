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

export const getKboGameList = async (req, res) => {
    try {
        let { gameDate, year, page, limit = 10 } = req.query;

        const queryParams = [];
        let whereClauses = [];

        // 날짜 필터
        if (gameDate) {
            queryParams.push(`${gameDate}`);
            whereClauses.push(`kgm.game_date = $${queryParams.length}`);
        }

        // 날짜 필터
        if (year) {
            queryParams.push(`${year}`);
            whereClauses.push(`kgm.season_year = $${queryParams.length}`);
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
            paginationClause = `LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`; // 파라미터 순서 명시적으로 지정
        }

        // 조회 쿼리
        const kboGameList = await query(`
            SELECT
                (ROW_NUMBER() OVER (ORDER BY kgm.season_year, kgm.game_date, kgm.game_time)) AS row_number,
                kgm.id as game_id,
                season_year , 
                away_team_id, 
                ati.name as away_team_name,
                home_team_id, 
                hti.name as home_team_name,
                stadium , 
                TO_CHAR(kgm.game_date, 'YYYY.MM.DD') as game_date , 
                TO_CHAR(kgm.game_time, 'HH24:MI') as game_time ,
                kgm.status
                , fta.sn as away_team_sn
                , fta.original_name as away_team_original_name
                , fta.size as away_team_size
                , fta.path as away_team_path
                , fta.mimetype as away_team_mimetype
                , fth.sn as home_team_sn
                , fth.original_name as home_team_original_name
                , fth.size as home_team_size
                , fth.path as home_team_path
                , fth.mimetype as home_team_mimetype
            FROM kbo_game_master kgm
                left join kbo_team_master ati on kgm.away_team_id = ati.id
                left join kbo_team_master hti on kgm.home_team_id = hti.id
                left join file_table fta on fta.file_id = ati.logo_url::uuid and fta.sn = 1
                left join file_table fth on fth.file_id = hti.logo_url::uuid and fth.sn = 1
            ${whereClause}
            ORDER BY kgm.season_year, kgm.game_date, kgm.game_time
            ${paginationClause}
        `, [...queryParams, ...paginationParams]);

        // 총 개수 조회
        let total = null;
        if (page) {
            const countResult = await query(`
                SELECT COUNT(DISTINCT kgm.id) AS total
                FROM kbo_game_master kgm
                ${whereClause}
            `, queryParams);
            total = parseInt(countResult.rows[0].total, 10);
        }

        const gameList = kboGameList.rows
        
        for(let idx=0;idx<gameList.length;idx++){
            let game = gameList[idx];

            let base64Image = null;
            if(game.away_team_path){
                const filePath = path.join(process.cwd(), game.away_team_path);
    
                base64Image = await convertFileToBase64(filePath, game.away_team_mimetype);
                kboGameList.rows[idx].away_team_path = base64Image;
            }
    
            let base64Image2 = null;
            if(game.home_team_path){
                const filePath = path.join(process.cwd(), game.home_team_path);
    
                base64Image2 = await convertFileToBase64(filePath, game.home_team_mimetype);
                kboGameList.rows[idx].home_team_path = base64Image2;
            }
        }
    
        

        return sendSuccess(res, {
            message: "게임 목록을 성공적으로 조회하였습니다.",
            gameList: kboGameList.rows,
            ...(page ? { total } : {})
        });
    } catch (error) {
        return sendServerError(res, error, '선수 목록 조회 중 문제가 발생하였습니다. 다시 시도해주세요.');
    }
};


export const createKboGame = async (req, res) => {
    const { 
        season_year , away_team_id, home_team_id, stadium , game_date , game_time
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
    if (!season_year || !away_team_id || !home_team_id || !stadium || !game_date || !game_time) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            // 게임 마스터 테이블 저장
            const insertGameQuery = `
                INSERT INTO kbo_game_master (
                    season_year , away_team_id, home_team_id, stadium , game_date 
                    , game_time, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, 
                 $6, 'scheduled', CURRENT_TIMESTAMP)
                RETURNING id
            `;
            const { rows } = await client.query(insertGameQuery, [
                season_year , away_team_id, home_team_id, stadium , game_date , game_time
            ]);

            const gameId = rows[0].id;

            return sendSuccess(res, {
                message: "게임이 성공적으로 생성되었습니다.",
                gameId
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const getKboGameDetail = async (req, res) => {
    let { gameId } = req.params;

    if (!gameId) {
        return sendBadRequest(res, "게임 정보가 잘못되었습니다.");
    }

    try {
        const gameInfoQuery = `
            SELECT 
                CASE 
                    WHEN kgr.team_id = kgm.away_team_id THEN 'away'
                    ELSE 'home'
                END AS team_type,
                kgr.id AS roster_id,
                kgr.game_id,
                kgr.team_id,
                ktm.name AS team_name,
                kgr.player_id,
                kp.name AS player_name,
                kgr.batting_order,
                kgr.role,
                kgr.replaced_by,
                krp.name AS replaced_player_name,
                kgr.replaced_inning,
                kgr.replaced_out,
                kgr.replaced_position,
                kgr.created_at,
                kgr.updated_at,
                kgr.position
            FROM kbo_game_roster kgr
            JOIN kbo_game_master kgm ON kgr.game_id = kgm.id
            LEFT JOIN kbo_team_master ktm ON kgr.team_id = ktm.id
            LEFT JOIN kbo_player_master kp ON kgr.player_id = kp.id
            LEFT JOIN kbo_player_master krp ON kgr.replaced_by = krp.id
            WHERE kgr.game_id = $1
            ORDER BY kgr.batting_order, CASE WHEN kgr.replaced_inning IS NULL THEN 0 ELSE kgr.replaced_inning END, CASE WHEN kgr.replaced_out IS NULL THEN 0 ELSE kgr.replaced_out END;
        `;
        
        const { rows : gameInfo} = await query(gameInfoQuery, [gameId]);

        // 조회 쿼리
        const { rows : kboGameDetailInfo } = await query(`
            SELECT
                (ROW_NUMBER() OVER (ORDER BY kgm.season_year, kgm.game_date, kgm.game_time)) AS row_number,
                kgm.id as game_id,
                season_year , 
                away_team_id, 
                ati.name as away_team_name,
                home_team_id, 
                hti.name as home_team_name,
                stadium , 
                TO_CHAR(kgm.game_date, 'YYYY.MM.DD') as game_date , 
                TO_CHAR(kgm.game_time, 'HH24:MI') as game_time ,
                kgm.status
                , fta.sn as away_team_sn
                , fta.original_name as away_team_original_name
                , fta.size as away_team_size
                , fta.path as away_team_path
                , fta.mimetype as away_team_mimetype
                , fth.sn as home_team_sn
                , fth.original_name as home_team_original_name
                , fth.size as home_team_size
                , fth.path as home_team_path
                , fth.mimetype as home_team_mimetype
            FROM kbo_game_master kgm
                left join kbo_team_master ati on kgm.away_team_id = ati.id
                left join kbo_team_master hti on kgm.home_team_id = hti.id
                left join file_table fta on fta.file_id = ati.logo_url::uuid and fta.sn = 1
                left join file_table fth on fth.file_id = hti.logo_url::uuid and fth.sn = 1
            WHERE kgm.id = $1
        `, [gameId]);

        let game = kboGameDetailInfo[0];

        let base64Image = null;
        if(game.away_team_path){
            const filePath = path.join(process.cwd(), game.away_team_path);

            base64Image = await convertFileToBase64(filePath, game.away_team_mimetype);
            kboGameDetailInfo[0].away_team_path = base64Image;
        }

        let base64Image2 = null;
        if(game.home_team_path){
            const filePath = path.join(process.cwd(), game.home_team_path);

            base64Image2 = await convertFileToBase64(filePath, game.home_team_mimetype);
            kboGameDetailInfo[0].home_team_path = base64Image2;
        }
        
        const awayTeamInfo = new Array();
        const homeTeamInfo = new Array();

        gameInfo.forEach(game => {
            if(game.team_type === "away") awayTeamInfo.push(game)
            else homeTeamInfo.push(game)
        })

        return sendSuccess(res, {
            message: '게임 정보가 조회되었습니다.',
            awayTeamInfo,
            homeTeamInfo,
            gameInfo : kboGameDetailInfo[0]
        });

    } catch (error) {
        console.error('게임 정보 조회 오류:', error);
        return sendServerError(res, error, '게임 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

export const deleteKboGame = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let { gameId } = req.body;
    if (!gameId) {
        return sendBadRequest(res, "삭제할 게임 ID가 제공되지 않았습니다.");
    }

    try {
        const user = jwt.verify(accessToken, process.env.JWT_SECRET);
        gameId = decryptData(gameId);

        await withTransaction(async (client) => {
            // **게임 존재 여부 확인**
            const { rows: gameRows } = await client.query(
                'SELECT * FROM kbo_game_master WHERE id = $1',
                [gameId]
            );

            if (gameRows.length === 0) {
                return sendBadRequest(res, "존재하지 않는 경기입니다.");
            }

            // **게임 마스터 정보 삭제**
            await client.query(
                'DELETE FROM kbo_game_master WHERE id = $1',
                [gameId]
            );

            return sendSuccess(res, "게임이 성공적으로 삭제되었습니다.");
        });
    } catch (error) {
        console.error('게임 삭제 중 오류 발생:', error);
        return sendServerError(res, error, "게임 삭제 중 오류가 발생했습니다.");
    }
};

export const updateKboGameStatus = async (req, res) => {
    const { gameId, status } = req.body;

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
    if (!gameId || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            // 게임 마스터 테이블 저장
            const updateStatusQuery = `
                UPDATE kbo_game_master SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1
            `;
            await client.query(updateStatusQuery, [ gameId, status ]);

            return sendSuccess(res, {
                message: "게임 상태가 성공적으로 변경되었습니다.",
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const createKboGameRoster = async (req, res) => {
    const { 
        game_id, team_id, player_id, batting_order, role, replaced_by, replaced_inning, replaced_out, position, replaced_position, isReplace
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
    if(isReplace){
        if (!game_id || !team_id || batting_order === null || batting_order === undefined || !player_id || !position || 
            !replaced_by || !replaced_inning || replaced_out === undefined || !replaced_position) {
            return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
        }
    }else{
        if (!game_id || !team_id || batting_order === null || batting_order === undefined || !player_id || !position) {
            return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
        }
    }

    try {
        await withTransaction(async (client) => {
            // 게임 마스터 테이블 저장
            const insertGameQuery = `
                INSERT INTO kbo_game_roster (
                    game_id, team_id, player_id, batting_order, role,
                    replaced_by, replaced_inning, replaced_out, position, replaced_position,
                    created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, 
                    $6, $7, $8, $9, $10,
                    CURRENT_TIMESTAMP
                )
                RETURNING id
            `;
            const { rows } = await client.query(insertGameQuery, [
                game_id, team_id, player_id, batting_order, role,
                replaced_by || null, (replaced_inning === undefined || replaced_inning === null)?null:replaced_inning, (replaced_out === undefined || replaced_out === null)?null:replaced_out, position, replaced_position || null
            ]);replaced_inning

            const gameRosterId = rows[0].id;

            return sendSuccess(res, {
                message: "게임 로스터가 성공적으로 생성되었습니다.",
                gameRosterId
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 로스터 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const deleteKboGameRoster = async (req, res) => {
    const { 
        roster_id
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
    if (!roster_id) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            const deleteRosterQuery = `
                DELETE FROM kbo_game_roster WHERE id = $1
            `;
            const { rows } = await client.query(deleteRosterQuery, [ roster_id ]);

            return sendSuccess(res, {
                message: "게임 로스터가 성공적으로 삭제되었습니다."
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 로스터 삭제 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}