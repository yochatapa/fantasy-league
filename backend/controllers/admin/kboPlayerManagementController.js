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
            limit = 10,
            name,
            teamIds,
            positions,
            birthDateFrom,
            birthDateTo,
            isRetiredList,
            activeYears,
            isForeignerList
        } = req.query;

        const queryParams = [];
        let whereClauses = [];

        // 이름 필터
        if (name) {
            queryParams.push(`%${name}%`);
            whereClauses.push(`kpm.name LIKE $${queryParams.length}`);
        }

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

        // 활동 여부 필터 (isRetiredList로 변경됨)
        if (isRetiredList) {
            const isActiveBoolList = isRetiredList.split(',').map(active => active === 'true');
            queryParams.push(...isActiveBoolList);
            const isActivePlaceholders = isActiveBoolList.map((_, idx) => `$${queryParams.length - isActiveBoolList.length + idx + 1}`);
            whereClauses.push(`kpm.is_retired IN (${isActivePlaceholders.join(', ')})`);
        }

        // 활동 연도 필터 (다중 선택 가능)
        if (activeYears) {
            const yearList = activeYears.split(',').map(year => parseInt(year, 10));
            queryParams.push(...yearList);
            const yearPlaceholders = yearList.map((_, idx) => `$${queryParams.length - yearList.length + idx + 1}`);
            whereClauses.push(`EXTRACT(YEAR FROM (kps.year || '-01-01')::DATE) IN (${yearPlaceholders.join(', ')})`);
        }

        // 외국인 선수 여부 필터 (다중 선택 가능)
        if (isForeignerList) {
            const isForeignerBoolList = isForeignerList.split(',').map(foreign => foreign === 'true');
            queryParams.push(...isForeignerBoolList);
            const foreignerPlaceholders = isForeignerBoolList.map((_, idx) => `$${queryParams.length - isForeignerBoolList.length + idx + 1}`);
            whereClauses.push(`kpm.is_foreigner IN (${foreignerPlaceholders.join(', ')})`);
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
                kpm.is_retired,
                kpm.is_foreigner,
                COALESCE(
                    (
                        SELECT kps.uniform_number
                        FROM kbo_player_season kps
                        WHERE kps.player_id = kpm.id
                        ORDER BY kps.year DESC
                        LIMIT 1
                    ), NULL
                ) AS last_uniform_number,
                COALESCE(
                    (
                        SELECT MIN(EXTRACT(YEAR FROM (kps.year || '-01-01')::DATE)) || '~' || MAX(EXTRACT(YEAR FROM (kps.year || '-01-01')::DATE))
                        FROM kbo_player_season kps
                        WHERE kps.player_id = kpm.id
                    ), '-'
                ) AS active_years
            FROM kbo_player_master kpm
            LEFT JOIN kbo_player_season kps ON kpm.id = kps.player_id
            LEFT JOIN kbo_team_master ktm ON ktm.id = kps.team_id
            ${whereClause}
            GROUP BY kpm.id
            ORDER BY kpm.name, kpm.birth_date
            ${paginationClause}
        `, [...queryParams, ...paginationParams]);

        // 총 개수 조회
        let total = null;
        if (page) {
            const countResult = await query(`
                SELECT COUNT(DISTINCT kpm.id) AS total
                FROM kbo_player_master kpm
                LEFT JOIN kbo_player_season kps ON kpm.id = kps.player_id
                ${whereClause}
            `, queryParams);
            total = parseInt(countResult.rows[0].total, 10);
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
    const { 
        name, birth_date, player_type, primary_position, seasons, 
        is_retired, draft_info, throwing_hand, batting_hand, 
        height, weight, contract_bonus, is_foreign 
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
                INSERT INTO kbo_player_master (
                    name, birth_date, player_type, primary_position, is_retired, 
                    draft_info, throwing_hand, batting_hand, height, weight, 
                    contract_bonus, is_foreign, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `;
            const { rows } = await client.query(insertPlayerQuery, [
                name, birth_date, player_type, primary_position, is_retired ?? false,
                draft_info, throwing_hand, batting_hand, height, weight,
                contract_bonus, is_foreign ?? false, user.user_id
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
    const { 
        name, birth_date, player_type, primary_position, seasons, 
        is_retired, draft_info, throwing_hand, batting_hand, 
        height, weight, contract_bonus, is_foreign 
    } = req.body;

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
                    is_retired = $5,
                    draft_info = $6,
                    throwing_hand = $7,
                    batting_hand = $8,
                    height = $9,
                    weight = $10,
                    contract_bonus = $11,
                    is_foreign = $12,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $13
                RETURNING id
            `;
            const { rows } = await client.query(updatePlayerQuery, [
                name,
                birth_date,
                player_type,
                primary_position,
                is_retired ?? false,
                draft_info,
                throwing_hand,
                batting_hand,
                height,
                weight,
                contract_bonus,
                is_foreign ?? false,
                playerId
            ]);

            // 시즌 정보 처리
            for (const season of seasons) {
                const { year, team_id, position, uniform_number, is_active, flag, id, contract_type, salary, start_date, end_date } = season;

                if (!year || !team_id || !Array.isArray(position) || !uniform_number || !flag) {
                    throw new Error("-1");
                }

                if (flag === 'I') {
                    const insertSeasonQuery = `
                        INSERT INTO kbo_player_season (
                            player_id, year, team_id, position, uniform_number, is_active,
                            contract_type, salary, start_date, end_date
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
                        )
                    `;
                    await client.query(insertSeasonQuery, [
                        playerId,
                        year,
                        team_id,
                        position.join(","),
                        uniform_number,
                        is_active,
                        contract_type,
                        salary,
                        start_date,
                        end_date
                    ]);
                } else if (flag === 'U') {
                    const updateSeasonQuery = `
                        UPDATE kbo_player_season
                        SET year = $1, team_id = $2, position = $3, uniform_number = $4, 
                            is_active = $5, contract_type = $6, salary = $7, start_date = $8, end_date = $9
                        WHERE id = $10
                    `;
                    await client.query(updateSeasonQuery, [
                        year,
                        team_id,
                        position.join(","),
                        uniform_number,
                        is_active,
                        contract_type,
                        salary,
                        start_date,
                        end_date,
                        id
                    ]);
                } else if (flag === 'D') {
                    const deleteSeasonQuery = `
                        DELETE FROM kbo_player_season WHERE id = $1
                    `;
                    await client.query(deleteSeasonQuery, [id]);
                }
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
        return sendServerError(res, error, errorMessage ?? "선수 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
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
                kpm.is_retired,
                kpm.draft_info,
                kpm.throwing_hand,
                kpm.batting_hand,
                kpm.height,
                kpm.weight,
                kpm.contract_bonus,
                kpm.is_foreign,
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
                kps.id,
                kps.year,
                kps.team_id,
                ktm.name AS team_name,
                string_to_array(kps.position, ',') AS position,
                kps.uniform_number,
                kps.is_active,
                COALESCE(ft.path, '') AS path,
                ft.mimetype,
                kps.contract_type,  -- 계약 유형
                kps.salary,         -- 연봉
                TO_CHAR(kps.start_date, 'YYYY.MM.DD') as start_date,     -- 계약 시작일
                TO_CHAR(kps.end_date, 'YYYY.MM.DD') as end_date        -- 계약 종료일
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
