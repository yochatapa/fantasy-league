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

export const getKboPlayerList = async (req, res) => {
    try {
        let { 
            page, 
            itemsPerPage = 10, 
            teamIds, 
            positions, 
            birthDateFrom, 
            birthDateTo, 
            isActive 
        } = req.query;

        const queryParams = [];
        let whereClauses = [];

        // 소속팀 필터 (다중 선택 가능)
        if (teamIds) {
            const teamIdList = teamIds.split(',').map(id => parseInt(id, 10));
            queryParams.push(...teamIdList);
            const teamPlaceholders = teamIdList.map((_, idx) => `$${queryParams.length - teamIdList.length + idx + 1}`);
            whereClauses.push(`kps.team_id IN (${teamPlaceholders.join(', ')})`);
        }

        // 포지션 필터 (다중 선택 가능)
        if (positions) {
            const positionList = positions.split(',');
            queryParams.push(...positionList);
            const positionPlaceholders = positionList.map((_, idx) => `$${queryParams.length - positionList.length + idx + 1}`);
            whereClauses.push(`(${positionPlaceholders.map(pos => `kps.position LIKE '%' || ${pos} || '%'`).join(' OR ')})`);
        }

        // 생년월일 필터
        if (birthDateFrom) {
            queryParams.push(birthDateFrom);
            whereClauses.push(`kpm.birth_date >= $${queryParams.length}`);
        }
        if (birthDateTo) {
            queryParams.push(birthDateTo);
            whereClauses.push(`kpm.birth_date <= $${queryParams.length}`);
        }

        // 활동 여부 필터
        if (isActive !== undefined) {
            const currentYear = new Date().getFullYear(); // 현재 년도
            queryParams.push(isActive === 'true');
            whereClauses.push(`
                EXISTS (
                    SELECT 1 
                    FROM kbo_player_season kps_sub
                    WHERE kps_sub.player_id = kpm.id
                    AND kps_sub.year = ${currentYear}
                    AND kps_sub.is_active = $${queryParams.length}
                )
            `);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 페이지네이션 여부 판단
        let paginationClause = '';
        if (page) {
            page = Math.max(1, parseInt(page, 10));
            itemsPerPage = Math.max(1, parseInt(itemsPerPage, 10));
            const offset = (page - 1) * itemsPerPage;

            queryParams.push(itemsPerPage);
            queryParams.push(offset);
            paginationClause = `LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
        }

        // 조회 쿼리 실행
        const kboPlayerList = await query(`
            SELECT 
                kpm.id,
                kpm.name,
                TO_CHAR(kpm.birth_date, 'YYYY.MM.DD') as birth_date,
                kpm.player_type,
                kpm.primary_position,
                COALESCE(
                    string_agg(DISTINCT ktm.name, ', ') 
                    FILTER (WHERE ktm.name IS NOT NULL), ''
                ) AS team_name,
                CASE 
                    WHEN BOOL_OR(kps.is_active AND kps.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT) THEN '현역'
                    ELSE '은퇴'
                END AS is_active_status,
                COALESCE(
                    (
                        SELECT kps.uniform_number 
                        FROM kbo_player_season kps 
                        WHERE kps.player_id = kpm.id 
                        ORDER BY kps.year DESC 
                        LIMIT 1
                    ), NULL
                ) AS last_uniform_number
                ,COALESCE(json_agg(
                    json_build_object(
                        'year', kps.year,
                        'team_id', kps.team_id,
                        'position', string_to_array(kps.position, ','),
                        'uniform_number', kps.uniform_number,
                        'is_active', kps.is_active
                    )
                    ORDER BY kps.is_active DESC, kps.year DESC
                ) FILTER (WHERE kps.id IS NOT NULL), '[]') AS seasons
            FROM kbo_player_master kpm
            LEFT JOIN (
                SELECT 
                    kps.* 
                FROM kbo_player_season kps
                ORDER BY kps.is_active DESC, kps.year DESC
            ) kps ON kpm.id = kps.player_id
            LEFT JOIN kbo_team_master ktm ON ktm.id = kps.team_id
            ${whereClause}
            GROUP BY kpm.id
            ORDER BY kpm.name, kpm.birth_date
            ${paginationClause}
        `, queryParams);
        
        

        // 총 개수 조회
        let total = null;
        if (page) {
            const countParams = [...queryParams];
            const totalPlayers = await query(`
                SELECT COUNT(*) AS total
                FROM kbo_player_master kpm
            `);

            total = parseInt(totalPlayers.rows[0].total, 10);
        }

        return sendSuccess(res, {
            message: "선수 목록을 성공적으로 조회하였습니다.",
            playerList: kboPlayerList.rows,
            ...(page ? { total } : {})
        });
    } catch (error) {
        return sendServerError(res, error, '선수 목록 조회 중 문제가 발생하였습니다. 다시 시도해주세요.');
    }
};



export const createKboPlayer = async (req, res) => {
    const { name, birth_date, player_type, primary_position, seasons } = req.body;

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
    if (!name || !birth_date || !player_type || !primary_position || !Array.isArray(seasons)) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }
    
    const validTypes = ['P', 'B'];
    if (!validTypes.includes(player_type)) {
        return sendBadRequest(res, "선수 유형 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            // 선수 마스터 테이블 저장
            const insertPlayerQuery = `
                INSERT INTO kbo_player_master (name, birth_date, player_type, primary_position, created_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;
            const { rows } = await client.query(insertPlayerQuery, [
                name,
                birth_date,
                player_type,
                primary_position,
                user.user_id
            ]);

            const playerId = rows[0].id;

            // 시즌 정보 저장
            for (const season of seasons) {
                const { year, team_id, position, uniform_number, is_active } = season;

                if (!year || !team_id || !Array.isArray(position) || !uniform_number) {
                    throw new Error("-1");
                }

                const insertSeasonQuery = `
                    INSERT INTO kbo_player_season (
                        player_id, year, team_id, position, uniform_number, is_active
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6
                    )
                `;
                await client.query(insertSeasonQuery, [
                    playerId,
                    year,
                    team_id,
                    position.join(","),
                    uniform_number,
                    is_active
                ]);
            }

            return sendSuccess(res, {
                message: "선수가 성공적으로 생성되었습니다.",
                playerId
            });
        });
    } catch (error) {
        let errorMessage;
        switch(error.message){
            case "-1" : errorMessage = "선수이력 항목에 필수값이 누락되었습니다."; break;
        }
        return sendServerError(res, error, errorMessage??"선수 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};


export const updateKboPlayer = async (req, res) => {
    const { name, birth_date, player_type, primary_position, seasons } = req.body;

    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let user;
    try {
        user = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (err) {
        return sendBadRequest(res, '유효하지 않은 토큰입니다.');
    }

    let { playerId } = req.params;
    playerId = decryptData(playerId);

    if (!playerId) {
        return sendBadRequest(res, "선수 정보가 잘못되었습니다.");
    }

    // 필수값 검증
    if (!name || !birth_date || !player_type || !primary_position || !Array.isArray(seasons)) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    const validTypes = ['P', 'B'];
    if (!validTypes.includes(player_type)) {
        return sendBadRequest(res, "선수 유형 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            // 선수 마스터 테이블 업데이트
            const updatePlayerQuery = `
                UPDATE kbo_player_master 
                SET 
                    name = $1,
                    birth_date = $2,
                    player_type = $3,
                    primary_position = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING id
            `;
            const { rows } = await client.query(updatePlayerQuery, [
                name,
                birth_date,
                player_type,
                primary_position,
                playerId
            ]);

            // 시즌 정보 삭제 후 새로 추가
            const deleteSeasonsQuery = `
                DELETE FROM kbo_player_season WHERE player_id = $1
            `;
            await client.query(deleteSeasonsQuery, [playerId]);

            // 시즌 정보 저장
            for (const season of seasons) {
                const { year, team_id, position, uniform_number, is_active } = season;

                if (!year || !team_id || !Array.isArray(position) || !uniform_number) {
                    throw new Error("-1");
                }

                const insertSeasonQuery = `
                    INSERT INTO kbo_player_season (
                        player_id, year, team_id, position, uniform_number, is_active
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6
                    )
                `;
                await client.query(insertSeasonQuery, [
                    playerId,
                    year,
                    team_id,
                    position.join(","),
                    uniform_number,
                    is_active
                ]);
            }

            return sendSuccess(res, {
                message: "선수가 성공적으로 수정되었습니다.",
                playerId
            });
        });
    } catch (error) {
        let errorMessage;
        switch(error.message){
            case "-1" : errorMessage = "선수이력 항목에 필수값이 누락되었습니다."; break;
        }
        return sendServerError(res, error, errorMessage??"선수 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const getKboPlayerDetail = async (req, res) => {
    let { playerId } = req.params;

    // 1️⃣ playerId 복호화
    playerId = decryptData(playerId);

    if (!playerId) {
        return sendBadRequest(res, "선수 정보가 잘못되었습니다.");
    }

    try {
        // 2️⃣ 선수 기본 정보 조회
        const playerInfoQuery = `
            SELECT
                kpm.id,
                kpm.name,
                TO_CHAR(kpm.birth_date, 'YYYY.MM.DD') as birth_date,
                kpm.player_type,
                kpm.primary_position,
                ft.file_id,
                ft.sn,
                ft.original_name,
                ft.size,
                ft.path,
                ft.mimetype
            FROM kbo_player_master kpm
            LEFT JOIN file_table ft ON ft.file_id = kpm.main_profile_image::uuid AND ft.sn = 1
            WHERE kpm.id = $1
        `;
        
        const playerInfo = await query(playerInfoQuery, [playerId]);

        if (playerInfo.rowCount === 0) {
            return sendBadRequest(res, '선수 정보가 없습니다.');
        }

        // 3️⃣ 시즌별 기록 조회
        const playerSeasonsQuery = `
            SELECT
                kps.year,
                kps.team_id,
                ktm.name AS team_name,
                string_to_array(kps.position, ',') AS position,
                kps.uniform_number,
                kps.is_active,
                COALESCE(ft.path, '') AS path,
                ft.mimetype
            FROM kbo_player_season kps
            LEFT JOIN kbo_team_master ktm ON ktm.id = kps.team_id
            LEFT JOIN file_table ft ON ft.file_id = kps.profile_image::uuid AND ft.sn = 1
            WHERE kps.player_id = $1
            ORDER BY kps.year DESC
        `;

        const playerSeasons = await query(playerSeasonsQuery, [playerId]);

        // 4️⃣ 프로필 이미지 처리
        const playerData = playerInfo.rows[0];
        let base64MainImage = null;

        // 메인 프로필 이미지 처리
        if (playerData.path) {
            const filePath = path.join(process.cwd(), playerData.path);
            base64MainImage = await convertFileToBase64(filePath, playerData.mimetype);
        }
        
        playerData.profile_image = base64MainImage;
        delete playerData.path; // path 정보는 필요 없으므로 삭제

        // 5️⃣ 시즌별 이미지 처리
        for (const season of playerSeasons.rows) {
            if (season.path) {
                const seasonFilePath = path.join(process.cwd(), season.path);
                season.profile_image = await convertFileToBase64(seasonFilePath, season.mimetype);
            } else {
                season.profile_image = null;
            }
            delete season.path;
            delete season.mimetype;
        }

        // 6️⃣ 중복된 팀명 제거 (최근 시즌 기준으로 하나만 유지)
        const uniqueTeams = new Set();
        playerSeasons.rows.forEach(season => uniqueTeams.add(season.team_name));
        playerData.team_names = Array.from(uniqueTeams).join(', ');

        // 7️⃣ 최종 응답 구성
        return sendSuccess(res, {
            message: '선수 정보가 조회되었습니다.',
            playerInfo: playerData,
            seasons: playerSeasons.rows
        });

    } catch (error) {
        console.error('선수 정보 조회 오류:', error);
        return sendServerError(res, error, '선수 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

// export const deleteKboTeam = async (req, res) => {
//     const accessToken = req.headers['authorization']?.split(' ')[1];

//     if (!accessToken) {
//         return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
//     }

//     let { teamId } = req.body;
//     if (!teamId) {
//         return sendBadRequest(res, "삭제할 팀 ID가 제공되지 않았습니다.");
//     }

//     try {
//         const user = jwt.verify(accessToken, process.env.JWT_SECRET);
//         teamId = decryptData(teamId);

//         await withTransaction(async (client) => {
//             // 팀 존재 여부 확인
//             const { rows: teamRows } = await client.query(
//                 'SELECT logo_url FROM kbo_team_master WHERE id = $1',
//                 [teamId]
//             );

//             if (teamRows.length === 0) {
//                 return sendBadRequest(res, "존재하지 않는 팀입니다.");
//             }

//             const logoFileId = teamRows[0].logo_url;

//             // 파일 삭제
//             if (logoFileId) {
//                 const { rows: fileRows } = await client.query(
//                     'SELECT path FROM file_table WHERE file_id = $1',
//                     [logoFileId]
//                 );

//                 for (const file of fileRows) {
//                     await deleteFile(file.path);
//                 }

//                 await client.query(
//                     'DELETE FROM file_table WHERE file_id = $1',
//                     [logoFileId]
//                 );
//             }

//             // 팀 삭제
//             await client.query(
//                 'DELETE FROM kbo_team_master WHERE id = $1',
//                 [teamId]
//             );

//             return sendSuccess(res, "팀이 성공적으로 삭제되었습니다.");
//         });
//     } catch (error) {
//         return sendServerError(res, error, "팀 삭제 중 오류가 발생했습니다.");
//     }
// };
