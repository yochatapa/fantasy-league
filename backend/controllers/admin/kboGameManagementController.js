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



// export const updateKboPlayer = async (req, res) => {
//     const {
//         name, birth_date, player_type, primary_position, seasons,
//         is_retired, draft_info, throwing_hand, batting_hand,
//         height: heightStr, // 임시 변수명으로 받음
//         weight: weightStr, // 임시 변수명으로 받음
//         contract_bonus: contractBonusStr, // 임시 변수명으로 받음
//         is_foreign,
//         main_profile_image
//     } = req.body;

//     const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

//     if (!accessToken) {
//         return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
//     }

//     let user;
//     try {
//         user = jwt.verify(accessToken, process.env.JWT_SECRET);
//     } catch (err) {
//         return sendBadRequest(res, '유효하지 않은 토큰입니다.');
//     }

//     let { playerId } = req.params;
//     playerId = decryptData(playerId);

//     if (!playerId) {
//         return sendBadRequest(res, "선수 정보가 잘못되었습니다.");
//     }
    
//     // 필수값 검증
//     if (!name || !birth_date || !player_type || !primary_position) {
//         return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
//     }

//     const validTypes = ['P', 'B'];
//     if (!validTypes.includes(player_type)) {
//         return sendBadRequest(res, "선수 유형 값이 올바르지 않습니다.");
//     }

//     try {
//         await withTransaction(async (client) => {
//             // 선수 마스터 테이블 업데이트
//             const updatePlayerQuery = `
//                 UPDATE kbo_player_master
//                 SET
//                     name = $1,
//                     birth_date = $2,
//                     player_type = $3,
//                     primary_position = $4,
//                     is_retired = $5,
//                     draft_info = $6,
//                     throwing_hand = $7,
//                     batting_hand = $8,
//                     height = $9,
//                     weight = $10,
//                     contract_bonus = $11,
//                     is_foreign = $12,
//                     updated_at = CURRENT_TIMESTAMP
//                 WHERE id = $13
//                 RETURNING id, main_profile_image
//             `;
//             const { rows } = await client.query(updatePlayerQuery, [
//                 name,
//                 birth_date,
//                 player_type,
//                 primary_position,
//                 is_retired ?? false,
//                 draft_info,
//                 throwing_hand,
//                 batting_hand,
//                 heightStr === '' || isNaN(Number(heightStr)) ? null : Number(heightStr),
//                 weightStr === '' || isNaN(Number(weightStr)) ? null : Number(weightStr),
//                 contractBonusStr === '' || isNaN(Number(contractBonusStr)) ? null : Number(contractBonusStr),
//                 is_foreign ?? false,
//                 playerId
//             ]);

//             const mainProfileImageId = rows[0].main_profile_image;

//             /* file 처리 - 메인 프로필 이미지 */
//             if (main_profile_image) {
//                 const { newFiles = [], deletedFiles = [] } = main_profile_image;

//                 // [Delete 처리] deletedFiles가 있을 경우 처리
//                 if (deletedFiles.length > 0) {
//                     for (const fileInfo of deletedFiles) {
//                         // DB에서 삭제할 파일 경로 조회
//                         const { rows: fileRows } = await client.query(
//                             'SELECT path FROM file_table WHERE file_id = $1 and sn = $2',
//                             [fileInfo.file_id, fileInfo.sn]
//                         );
            
//                         // 실제 파일 삭제
//                         for (const file of fileRows) {
//                             await deleteFile(file.path);
//                         }
            
//                         // DB에서 파일 정보 삭제
//                         await client.query(
//                             'DELETE FROM file_table WHERE file_id = $1 and sn = $2',
//                             [fileInfo.file_id,fileInfo.sn]
//                         );
//                     }
//                 }
            
//                 // [Insert 처리] newFiles가 있을 경우 처리
//                 if (newFiles.length > 0) {
//                     for (const mainProfileImageFile of newFiles) {
//                         const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboPlayer', playerId.toString(), 'profile');
            
//                         const finalFileSavedInfo = await saveUploadedFile({
//                             originalName: mainProfileImageFile.originalName,
//                             filename: mainProfileImageFile.filename,
//                             path: mainProfileImageFile.path,
//                             size: mainProfileImageFile.size,
//                             mimetype: mainProfileImageFile.mimetype
//                         }, userSpecificUploadDir);
            
//                         const finalFileUrlForDB = path.join(
//                             'uploads',
//                             'kboPlayer',
//                             playerId.toString(),
//                             'profile',
//                             finalFileSavedInfo.finalFileName
//                         );
            
//                         // 파일 ID 생성
//                         const mainProfileFileId = mainProfileImageId || uuidv4();
            
//                         // sn 값 조회
//                         const maxSn = await client.query(
//                             "SELECT COALESCE(max(sn),0) as sn FROM file_table WHERE file_id = $1",
//                             [mainProfileFileId]
//                         );
                        
//                         // DB에 Insert
//                         await client.query(`
//                             INSERT INTO file_table (
//                                 file_id, sn, original_name, unique_name,
//                                 mimetype, size, path, category, uploaded_by
//                             ) VALUES (
//                                 $1, $2, $3, $4, $5, $6, $7, $8, $9
//                             )
//                         `, [
//                             mainProfileFileId,
//                             maxSn.rows[0].sn + 1,
//                             mainProfileImageFile.originalName,
//                             finalFileSavedInfo.finalFileName,
//                             mainProfileImageFile.mimetype,
//                             mainProfileImageFile.size,
//                             finalFileUrlForDB,
//                             'kboPlayerProfile',
//                             user.user_id
//                         ]);
            
//                         // 🔹 kbo_player_master 테이블 업데이트
//                         await client.query(`
//                             UPDATE kbo_player_master
//                             SET main_profile_image = $1
//                             WHERE id = $2
//                         `, [mainProfileFileId, playerId]);
//                     }
//                 }
//             }

//             // 시즌 정보 처리
//             if(seasons)
//             for (const season of seasons) {
//                 const { year, team_id, position, uniform_number, is_active, flag, id, contract_type, salary: salaryStr, start_date, end_date, profile_image } = season;
                
//                 if (!year || !team_id || !Array.isArray(position) || !uniform_number || !flag) {
//                     throw new Error("-1");
//                 }

//                 const salaryValue = salaryStr === '' || isNaN(Number(salaryStr)) ? null : Number(salaryStr);

//                 if (flag === 'I') {
//                     const insertSeasonQuery = `
//                         INSERT INTO kbo_player_season (
//                             player_id, year, team_id, position, uniform_number, is_active,
//                             contract_type, salary, start_date, end_date
//                         ) VALUES (
//                             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
//                         )
//                         RETURNING id
//                     `;
//                     const { rows : seasonRows } = await client.query(insertSeasonQuery, [
//                         playerId,
//                         year,
//                         team_id,
//                         position.join(","),
//                         uniform_number,
//                         is_active || true,
//                         contract_type,
//                         salaryValue,
//                         start_date === "" ? year + '0101' : start_date,
//                         end_date === "" ? year + '1231' : end_date,
//                     ]);

//                     const newSeasonId = seasonRows[0].id
                    
//                     if(profile_image){
//                         const { newFiles = [], deletedFiles = [] } = profile_image;
                        
//                         // [Insert 처리] newFiles가 있을 경우 처리
//                         if (newFiles.length > 0) {
//                             for (const profileImageFile of newFiles) {
//                                 const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboPlayer', playerId.toString(), 'profile','seasons', newSeasonId.toString());
                    
//                                 const finalFileSavedInfo = await saveUploadedFile({
//                                     originalName: profileImageFile.originalName,
//                                     filename: profileImageFile.filename,
//                                     path: profileImageFile.path,
//                                     size: profileImageFile.size,
//                                     mimetype: profileImageFile.mimetype
//                                 }, userSpecificUploadDir);
                    
//                                 const finalFileUrlForDB = path.join(
//                                     'uploads',
//                                     'kboPlayer',
//                                     playerId.toString(),
//                                     'profile',
//                                     'seasons',
//                                     newSeasonId.toString(),
//                                     finalFileSavedInfo.finalFileName
//                                 );
                    
//                                 // 파일 ID 생성
//                                 const profileFileId = uuidv4();
                    
//                                 // sn 값 조회
//                                 const maxSn = await client.query(
//                                     "SELECT COALESCE(max(sn),0) as sn FROM file_table WHERE file_id = $1",
//                                     [profileFileId]
//                                 );
                                
//                                 // DB에 Insert
//                                 await client.query(`
//                                     INSERT INTO file_table (
//                                         file_id, sn, original_name, unique_name,
//                                         mimetype, size, path, category, uploaded_by
//                                     ) VALUES (
//                                         $1, $2, $3, $4, $5, $6, $7, $8, $9
//                                     )
//                                 `, [
//                                     profileFileId,
//                                     maxSn.rows[0].sn + 1,
//                                     profileImageFile.originalName,
//                                     finalFileSavedInfo.finalFileName,
//                                     profileImageFile.mimetype,
//                                     profileImageFile.size,
//                                     finalFileUrlForDB,
//                                     'kboPlayerSeasonProfile',
//                                     user.user_id
//                                 ]);
                    
//                                 // 🔹 kbo_player_master 테이블 업데이트
//                                 await client.query(`
//                                     UPDATE kbo_player_season
//                                     SET profile_image = $1
//                                     WHERE id = $2
//                                 `, [profileFileId, newSeasonId]);
//                             }
//                         }
//                     }
//                 } else if (flag === 'U') {
//                     const updateSeasonQuery = `
//                         UPDATE kbo_player_season
//                         SET year = $1, team_id = $2, position = $3, uniform_number = $4,
//                             is_active = $5, contract_type = $6, salary = $7, start_date = $8, end_date = $9
//                         WHERE id = $10
//                         RETURNING profile_image
//                     `;

//                     const { rows : updateSeasonInfo } = await client.query(updateSeasonQuery, [
//                         year,
//                         team_id,
//                         position.join(","),
//                         uniform_number,
//                         is_active || true,
//                         contract_type,
//                         salaryValue,
//                         start_date === "" ? year + '0101' : start_date,
//                         end_date === "" ? year + '1231' : end_date,
//                         id
//                     ]);

//                     const profileImageId = updateSeasonInfo[0].profile_image

//                     if(profile_image){
//                         const { newFiles = [], deletedFiles = [] } = profile_image;

//                         // [Delete 처리] deletedFiles가 있을 경우 처리
//                         if (deletedFiles.length > 0) {
//                             for (const fileInfo of deletedFiles) {
//                                 // DB에서 삭제할 파일 경로 조회
//                                 const { rows: fileRows } = await client.query(
//                                     'SELECT path FROM file_table WHERE file_id = $1 and sn = $2',
//                                     [fileInfo.file_id, fileInfo.sn]
//                                 );
                    
//                                 // 실제 파일 삭제
//                                 for (const file of fileRows) {
//                                     await deleteFile(file.path);
//                                 }
                    
//                                 // DB에서 파일 정보 삭제
//                                 await client.query(
//                                     'DELETE FROM file_table WHERE file_id = $1 and sn = $2',
//                                     [fileInfo.file_id,fileInfo.sn]
//                                 );
//                             }
//                         }
                        
//                         // [Insert 처리] newFiles가 있을 경우 처리
//                         if (newFiles.length > 0) {
//                             for (const profileImageFile of newFiles) {
//                                 const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboPlayer', playerId.toString(), 'profile','seasons', id.toString());
                    
//                                 const finalFileSavedInfo = await saveUploadedFile({
//                                     originalName: profileImageFile.originalName,
//                                     filename: profileImageFile.filename,
//                                     path: profileImageFile.path,
//                                     size: profileImageFile.size,
//                                     mimetype: profileImageFile.mimetype
//                                 }, userSpecificUploadDir);
                    
//                                 const finalFileUrlForDB = path.join(
//                                     'uploads',
//                                     'kboPlayer',
//                                     playerId.toString(),
//                                     'profile',
//                                     'seasons',
//                                     id.toString(),
//                                     finalFileSavedInfo.finalFileName
//                                 );
                    
//                                 // 파일 ID 생성
//                                 const profileFileId = profileImageId || uuidv4();
                    
//                                 // sn 값 조회
//                                 const maxSn = await client.query(
//                                     "SELECT COALESCE(max(sn),0) as sn FROM file_table WHERE file_id = $1",
//                                     [profileFileId]
//                                 );
                                
//                                 // DB에 Insert
//                                 await client.query(`
//                                     INSERT INTO file_table (
//                                         file_id, sn, original_name, unique_name,
//                                         mimetype, size, path, category, uploaded_by
//                                     ) VALUES (
//                                         $1, $2, $3, $4, $5, $6, $7, $8, $9
//                                     )
//                                 `, [
//                                     profileFileId,
//                                     maxSn.rows[0].sn + 1,
//                                     profileImageFile.originalName,
//                                     finalFileSavedInfo.finalFileName,
//                                     profileImageFile.mimetype,
//                                     profileImageFile.size,
//                                     finalFileUrlForDB,
//                                     'kboPlayerSeasonProfile',
//                                     user.user_id
//                                 ]);
                    
//                                 // 🔹 kbo_player_master 테이블 업데이트
//                                 await client.query(`
//                                     UPDATE kbo_player_season
//                                     SET profile_image = $1
//                                     WHERE id = $2
//                                 `, [profileFileId, id]);
//                             }
//                         }
//                     }
//                 } else if (flag === 'D') {
//                     const { rows: seasonRows } = await client.query(
//                         'SELECT profile_image FROM kbo_player_season WHERE id = $1',
//                         [id]
//                     );
        
//                     const profileFileId = seasonRows[0].profile_image;
        
//                     // 2️⃣ **파일 삭제 처리**
//                     if (profileFileId) {
//                         const { rows: fileRows } = await client.query(
//                             'SELECT path FROM file_table WHERE file_id = $1',
//                             [profileFileId]
//                         );
        
//                         for (const file of fileRows) {
//                             await deleteFile(file.path);
//                         }
        
//                         await client.query(
//                             'DELETE FROM file_table WHERE file_id = $1',
//                             [profileFileId]
//                         );
//                     }
                    
//                     const deleteSeasonQuery = `
//                         DELETE FROM kbo_player_season WHERE id = $1
//                     `;
//                     await client.query(deleteSeasonQuery, [id]);
//                 }
//             }

//             return sendSuccess(res, {
//                 message: "선수가 성공적으로 수정되었습니다.",
//                 playerId
//             });
//         });
//     } catch (error) {
//         let errorMessage;
//         switch (error.message) {
//             case "-1":
//                 errorMessage = "선수이력 항목에 필수값이 누락되었습니다.";
//                 break;
//         }
//         return sendServerError(res, error, errorMessage ?? "선수 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
//     }
// };

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
                kgr.position,
                kgr.batting_order,
                kgr.role,
                kgr.replaced_by,
                krp.name AS replaced_player_name,
                kgr.replaced_inning,
                kgr.replaced_out,
                kgr.status,
                kgr.created_at,
                kgr.updated_at
            FROM kbo_game_roster kgr
            JOIN kbo_game_master kgm ON kgr.game_id = kgm.id
            LEFT JOIN kbo_team_master ktm ON kgr.team_id = ktm.id
            LEFT JOIN kbo_player_master kp ON kgr.player_id = kp.id
            LEFT JOIN kbo_player_master krp ON kgr.replaced_by = krp.id
            WHERE kgr.game_id = $1
            ORDER BY kgr.batting_order, kgr.replaced_inning, kgr.replaced_out;
        `;
        
        const { rows : gameInfo} = await query(gameInfoQuery, [gameId]);
        
        const awayTeamInfo = new Array();
        const homeTeamInfo = new Array();

        gameInfo.forEach(game => {
            if(game.team_type === "away") awayTeamInfo.push(game)
            else homeTeamInfo.push(game)
        })

        return sendSuccess(res, {
            message: '게임 정보가 조회되었습니다.',
            awayTeamInfo,
            homeTeamInfo
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
