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
                COALESCE(json_agg(
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
    console.log(name, birth_date, player_type, primary_position, seasons)
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
                    return sendBadRequest(res, "선수이력 항목에 필수값이 누락되었습니다.");
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
        return sendServerError(res, error, "선수 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};


// export const updateKboTeam = async (req, res) => {
//     const { name, code, founding_year, status, disband_year } = req.body;
//     let { deletedFiles } = req.body;

//     let { teamId } = req.params;

//     const uploadedFilesInfo = req.filesInfo;
    
//     const teamLogoInfo = uploadedFilesInfo?.filter(f => f.fieldName === 'newFiles');

//     const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    
//     if(!accessToken){
//         return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
//     }

//     const user = jwt.verify(accessToken, process.env.JWT_SECRET);
    
//     teamId = decryptData(teamId)

//     if(!teamId){
//         return sendBadRequest(res, "팀 정보가 잘못되었습니다.");
//     }

//     // 필수값 확인
//     if (!teamId || !name || !code || !founding_year || !status) {
//         return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
//     }

//     // status 값 유효성 확인
//     const validStatuses = ['active', 'inactive'];
//     if (!validStatuses.includes(status)) {
//         return sendBadRequest(res, "status 값이 올바르지 않습니다.");
//     }

//     try {
//         await withTransaction(async (client) => {
//             // 중복 코드 확인
//             const { rows: existing } = await client.query(
//                 'SELECT id, logo_url FROM kbo_team_master WHERE code = $1',
//                 [code]
//             );
            
//             if (existing.length > 0 && existing.find((row)=>row.id !== teamId)) {
//                 return sendBadRequest(res, "이미 존재하는 팀 코드입니다.");
//             }

//             // UPDATE 쿼리 실행
//             const updateQuery = `
//                 UPDATE kbo_team_master SET
//                     name = $2
//                     , code = $3
//                     , founding_year = $4
//                     , status = $5
//                     , disband_year = $6
//                 where id = $1
//             `;
//             const params = [teamId, name, code, founding_year, status, disband_year || null];

//             if(deletedFiles){
//                 deletedFiles = JSON.parse(deletedFiles);

//                 deletedFiles.forEach(async deletedFile => {
//                     // 파일 삭제
//                     const filePath = await client.query("SELECT path FROM file_table WHERE file_id = $1 and sn = $2",[deletedFile.file_id,deletedFile.sn])
                    
//                     if(filePath.rows[0]){
//                         await deleteFile(filePath.rows[0].path)

//                         const deletedFilesQuery = "DELETE FROM file_table WHERE file_id = $1 and sn = $2";

//                         await client.query(deletedFilesQuery,[deletedFile.file_id,deletedFile.sn])
//                     }
//                 });                
//             }
            
//             await client.query(updateQuery, params);

//             /* file 처리 */
//             let finalFileSavedInfo = null; // saveUploadedFile 함수가 반환할 최종 파일 정보
//             let finalFileUrlForDB = null; // DB file_path 컬럼에 저장할 경로/URL
//             console.log("logo_url",existing[0].logo_url)
//             const generatedFileId = existing[0].logo_url??uuidv4();

//             if (teamLogoInfo && teamId !== null) { // 파일이 업로드되었고 유저 ID 발급된 경우
//                 // 1. uuid file_id 생성
                
//                 const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboTeam', teamId.toString(), 'logo');

//                 for(let idx=0;idx<teamLogoInfo.length;idx++){
//                     // saveUploadedFile 함수를 호출하여 파일 복사
//                     finalFileSavedInfo = await saveUploadedFile(teamLogoInfo[idx], userSpecificUploadDir);
//                     console.log('파일 복사 완료 :', finalFileSavedInfo);

//                     // DB에 저장할 파일 경로/URL 구성 (예: 프로젝트 루트 기준 상대 경로)
//                     finalFileUrlForDB = path.join('uploads', 'kboTeam', teamId.toString(), 'logo', finalFileSavedInfo.finalFileName);       
                    
//                     const maxSn = await client.query("SELECT COALESCE(max(sn),0) as sn FROM file_table WHERE file_id = $1",[generatedFileId])

//                     // 2. 파일 정보 DB 저장 쿼리 실행
//                     const insertFileQuery = `
//                         INSERT INTO file_table (
//                             file_id, sn, original_name, unique_name,
//                             mimetype, size, path, category, uploaded_by
//                         ) VALUES (
//                             $1, $2, $3, $4, $5, $6, $7, $8, $9
//                         )
//                     `;

//                     await client.query(insertFileQuery, [
//                         generatedFileId, // uuid
//                         maxSn.rows[0].sn+1,
//                         teamLogoInfo[idx].originalName,
//                         finalFileSavedInfo.finalFileName,
//                         teamLogoInfo[idx].mimetype,
//                         teamLogoInfo[idx].size,
//                         finalFileUrlForDB,
//                         'kboTeamLogo',
//                         user.user_id
//                     ]);                    
//                 }
//             }

//             if(!existing.logo_url){
//                 // 3. user_master 테이블에 profile_image 컬럼 업데이트
//                 const updateUserQuery = `
//                     UPDATE kbo_team_master
//                     SET 
//                         logo_url = $1
//                         , updated_at = CURRENT_TIMESTAMP
//                     WHERE id = $2
//                 `;

//                 await client.query(updateUserQuery, [
//                     generatedFileId, // profile_image는 uuid
//                     teamId,
//                 ]);
//             }

//             const rowNumerQuery = `
//                 SELECT row_number
//                 FROM (
//                     SELECT 
//                         id,
//                         ROW_NUMBER() OVER (ORDER BY status, founding_year, disband_year, id) AS row_number
//                     FROM public.kbo_team_master
//                 ) AS ordered_teams
//                 WHERE id = $1`

//             const rowNumber = await client.query(rowNumerQuery, [teamId]);
            
//             const page = Math.ceil(rowNumber.rows[0].row_number/10)

//             return sendSuccess(res, 
//             {
//                 message : "팀이 성공적으로 수정되었습니다.",
//                 page
//             });
//         });
//     } catch (error) {
//         return sendServerError(res, error, "팀 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
//     }
// }

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
