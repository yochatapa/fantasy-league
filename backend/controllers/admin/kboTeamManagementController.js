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

export const getKboTeamList = async (req, res) => {
    try {
        let { page, itemsPerPage = 10, year } = req.query;

        const queryParams = [];
        let whereClauses = [];

        // year 필터
        if (year) {
            queryParams.push(parseInt(year, 10));
            whereClauses.push(`ktm.founding_year <= $${queryParams.length}`);

            queryParams.push(parseInt(year, 10));
            whereClauses.push(`(ktm.disband_year IS NULL OR ktm.disband_year >= $${queryParams.length})`);
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

        const kboTeamList = await query(`
            SELECT
                ktm.id,
                ktm.name,
                ktm.code,
                ktm.founding_year,
                ktm.disband_year,
                ktm.status,
                ft.file_id,
                ft.sn,
                ft.original_name,
                ft.size,
                ft.path,
                ft.mimetype
            FROM kbo_team_master ktm
                LEFT JOIN file_table ft ON ft.file_id = ktm.logo_url::uuid AND ft.sn = 1
            ${whereClause}
            ORDER BY ktm.status, ktm.founding_year, ktm.disband_year, ktm.id
            ${paginationClause}
        `, queryParams);

        // 총 개수 조회 (페이징일 때만)
        let total = null;
        if (page) {
            const countParams = [];
            if (year) {
                countParams.push(parseInt(year, 10));
                countParams.push(parseInt(year, 10));
            }

            const totalTeams = await query(`
                SELECT COUNT(*) AS total
                FROM kbo_team_master ktm
                ${whereClause}
            `, countParams);

            total = parseInt(totalTeams.rows[0].total, 10);
        }

        // 이미지 base64 변환
        for (let team of kboTeamList.rows) {
            if (team.path) {
                const filePath = path.join(process.cwd(), team.path);
                team.path = await convertFileToBase64(filePath, team.mimetype);
            }
        }

        return sendSuccess(res, {
            message: "팀 목록을 성공적으로 조회하였습니다.",
            teamList: kboTeamList.rows,
            ...(page ? { total } : {})  // page가 없으면 total도 제외
        });
    } catch (error) {
        return sendServerError(res, error, '팀 목록 조회 중 문제가 발생하였습니다. 다시 시도해주세요.');
    }
};



export const createKboTeam = async (req, res) => {
    const { name, code, founding_year, logo_url, status, disband_year } = req.body;

    const uploadedFilesInfo = req.filesInfo;
    
    const teamLogoInfo = uploadedFilesInfo?.filter(f => f.fieldName === 'newFiles');

    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    
    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    // 필수값 확인
    if (!name || !code || !founding_year || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    // status 값 유효성 확인
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
        return sendBadRequest(res, "status 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            // 중복 코드 확인
            const { rows: existing } = await client.query(
                'SELECT 1 FROM kbo_team_master WHERE code = $1',
                [code]
            );
            if (existing.length > 0) {
                return sendBadRequest(res, "이미 존재하는 팀 코드입니다.");
            }

            // INSERT 쿼리 실행
            const insertQuery = `
                INSERT INTO kbo_team_master (name, code, founding_year, logo_url, status, disband_year)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const values = [name, code, founding_year, logo_url || null, status, disband_year || null];

            const { rows } = await client.query(insertQuery, values);

            const teamId = rows[0].id

            /* file 처리 */
            let finalFileSavedInfo = null; // saveUploadedFile 함수가 반환할 최종 파일 정보
            let finalFileUrlForDB = null; // DB file_path 컬럼에 저장할 경로/URL
            
            if (teamLogoInfo && teamId !== null) { // 파일이 업로드되었고 유저 ID 발급된 경우
                // 1. uuid file_id 생성
                const generatedFileId = uuidv4();
                const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboTeam', teamId.toString(), 'logo');

                for(let idx=0;idx<teamLogoInfo.length;idx++){
                    // saveUploadedFile 함수를 호출하여 파일 복사
                    finalFileSavedInfo = await saveUploadedFile(teamLogoInfo[idx], userSpecificUploadDir);
                    console.log('파일 복사 완료 :', finalFileSavedInfo);

                    // DB에 저장할 파일 경로/URL 구성 (예: 프로젝트 루트 기준 상대 경로)
                    finalFileUrlForDB = path.join('uploads', 'kboTeam', teamId.toString(), 'logo', finalFileSavedInfo.finalFileName);                    

                    // 2. 파일 정보 DB 저장 쿼리 실행
                    const insertFileQuery = `
                        INSERT INTO file_table (
                            file_id, sn, original_name, unique_name,
                            mimetype, size, path, category, uploaded_by
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9
                        )
                    `;

                    await client.query(insertFileQuery, [
                        generatedFileId, // uuid
                        idx+1,
                        teamLogoInfo[idx].originalName,
                        finalFileSavedInfo.finalFileName,
                        teamLogoInfo[idx].mimetype,
                        teamLogoInfo[idx].size,
                        finalFileUrlForDB,
                        'kboTeamLogo',
                        user.user_id
                    ]);                    
                }
                
                // 3. user_master 테이블에 profile_image 컬럼 업데이트
                const updateUserQuery = `
                    UPDATE kbo_team_master
                    SET 
                        logo_url = $1
                        , updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `;

                await client.query(updateUserQuery, [
                    generatedFileId, // profile_image는 uuid
                    teamId,
                ]);

            } else {
                // 파일이 업로드되지 않은 경우
                console.log("No Kbo Team Logo Uploaded.");
            }

            const rowNumerQuery = `
                SELECT row_number
                FROM (
                    SELECT 
                        id,
                        ROW_NUMBER() OVER (ORDER BY status, founding_year, disband_year, id) AS row_number
                    FROM public.kbo_team_master
                ) AS ordered_teams
                WHERE id = $1`

            const rowNumber = await client.query(rowNumerQuery, [teamId]);
            
            const page = Math.ceil(rowNumber.rows[0].row_number/10)

            return sendSuccess(res,{
                message : "팀이 성공적으로 생성되었습니다.",
                teamId,
                page
            });
        });
    } catch (error) {
        return sendServerError(res, error, "팀 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const updateKboTeam = async (req, res) => {
    const { name, code, founding_year, status, disband_year } = req.body;
    let { deletedFiles } = req.body;

    let { teamId } = req.params;

    const uploadedFilesInfo = req.filesInfo;
    
    const teamLogoInfo = uploadedFilesInfo?.filter(f => f.fieldName === 'newFiles');

    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    
    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);
    
    teamId = decryptData(teamId)

    if(!teamId){
        return sendBadRequest(res, "팀 정보가 잘못되었습니다.");
    }

    // 필수값 확인
    if (!teamId || !name || !code || !founding_year || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    // status 값 유효성 확인
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
        return sendBadRequest(res, "status 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            // 중복 코드 확인
            const { rows: existing } = await client.query(
                'SELECT id, logo_url FROM kbo_team_master WHERE code = $1',
                [code]
            );
            
            if (existing.length > 0 && existing.find((row)=>row.id !== teamId)) {
                return sendBadRequest(res, "이미 존재하는 팀 코드입니다.");
            }

            // UPDATE 쿼리 실행
            const updateQuery = `
                UPDATE kbo_team_master SET
                    name = $2
                    , code = $3
                    , founding_year = $4
                    , status = $5
                    , disband_year = $6
                where id = $1
            `;
            const params = [teamId, name, code, founding_year, status, disband_year || null];

            if(deletedFiles){
                deletedFiles = JSON.parse(deletedFiles);

                deletedFiles.forEach(async deletedFile => {
                    // 파일 삭제
                    const filePath = await client.query("SELECT path FROM file_table WHERE file_id = $1 and sn = $2",[deletedFile.file_id,deletedFile.sn])
                    
                    if(filePath.rows[0]){
                        await deleteFile(filePath.rows[0].path)

                        const deletedFilesQuery = "DELETE FROM file_table WHERE file_id = $1 and sn = $2";

                        await client.query(deletedFilesQuery,[deletedFile.file_id,deletedFile.sn])
                    }
                });                
            }
            
            await client.query(updateQuery, params);

            /* file 처리 */
            let finalFileSavedInfo = null; // saveUploadedFile 함수가 반환할 최종 파일 정보
            let finalFileUrlForDB = null; // DB file_path 컬럼에 저장할 경로/URL
            console.log("logo_url",existing[0].logo_url)
            const generatedFileId = existing[0].logo_url??uuidv4();

            if (teamLogoInfo && teamId !== null) { // 파일이 업로드되었고 유저 ID 발급된 경우
                // 1. uuid file_id 생성
                
                const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboTeam', teamId.toString(), 'logo');

                for(let idx=0;idx<teamLogoInfo.length;idx++){
                    // saveUploadedFile 함수를 호출하여 파일 복사
                    finalFileSavedInfo = await saveUploadedFile(teamLogoInfo[idx], userSpecificUploadDir);
                    console.log('파일 복사 완료 :', finalFileSavedInfo);

                    // DB에 저장할 파일 경로/URL 구성 (예: 프로젝트 루트 기준 상대 경로)
                    finalFileUrlForDB = path.join('uploads', 'kboTeam', teamId.toString(), 'logo', finalFileSavedInfo.finalFileName);       
                    
                    const maxSn = await client.query("SELECT COALESCE(max(sn),0) as sn FROM file_table WHERE file_id = $1",[generatedFileId])

                    // 2. 파일 정보 DB 저장 쿼리 실행
                    const insertFileQuery = `
                        INSERT INTO file_table (
                            file_id, sn, original_name, unique_name,
                            mimetype, size, path, category, uploaded_by
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9
                        )
                    `;

                    await client.query(insertFileQuery, [
                        generatedFileId, // uuid
                        maxSn.rows[0].sn+1,
                        teamLogoInfo[idx].originalName,
                        finalFileSavedInfo.finalFileName,
                        teamLogoInfo[idx].mimetype,
                        teamLogoInfo[idx].size,
                        finalFileUrlForDB,
                        'kboTeamLogo',
                        user.user_id
                    ]);                    
                }
            }

            if(!existing.logo_url){
                // 3. user_master 테이블에 profile_image 컬럼 업데이트
                const updateUserQuery = `
                    UPDATE kbo_team_master
                    SET 
                        logo_url = $1
                        , updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                `;

                await client.query(updateUserQuery, [
                    generatedFileId, // profile_image는 uuid
                    teamId,
                ]);
            }

            const rowNumerQuery = `
                SELECT row_number
                FROM (
                    SELECT 
                        id,
                        ROW_NUMBER() OVER (ORDER BY status, founding_year, disband_year, id) AS row_number
                    FROM public.kbo_team_master
                ) AS ordered_teams
                WHERE id = $1`

            const rowNumber = await client.query(rowNumerQuery, [teamId]);
            
            const page = Math.ceil(rowNumber.rows[0].row_number/10)

            return sendSuccess(res, 
            {
                message : "팀이 성공적으로 수정되었습니다.",
                page
            });
        });
    } catch (error) {
        return sendServerError(res, error, "팀 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const getKboTeamDetail = async (req, res) => {
    let { teamId } = req.params;
    
    teamId = decryptData(teamId)

    if(!teamId){
        return sendBadRequest(res, "팀 정보가 잘못되었습니다.");
    }

    try {
        let teamInfoQuery = `
            SELECT
                ktm.id
                , ktm.name
                , ktm.code
                , ktm.founding_year
                , ktm.status
                , ktm.disband_year
                , ft.file_id
                , ft.sn
                , ft.original_name
                , ft.size
                , ft.path
                , ft.mimetype
            FROM kbo_team_master ktm
                left join file_table ft on ft.file_id = ktm.logo_url::uuid and ft.sn = 1
            WHERE ktm.id = $1
        `;

        const param = [teamId];

        const teamInfo = await query(teamInfoQuery, param);

        const teamLogo = teamInfo.rows[0]
        let base64Image = null;
    
        if(teamLogo.path){
            const filePath = path.join(process.cwd(), teamLogo.path);

            base64Image = await convertFileToBase64(filePath, teamLogo.mimetype);
        }
        
        teamInfo.rows[0].path = base64Image
        
        if(!teamInfo.rows[0])
            return sendBadRequest(res, '팀 정보가 없습니다.');

        return sendSuccess(res, {
            message: '팀 정보가 조회되었습니다.',
            teamInfo : teamInfo.rows[0]
        });
    } catch (error) {
        return sendServerError(res, error, '팀 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const deleteKboTeam = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let { teamId } = req.body;
    if (!teamId) {
        return sendBadRequest(res, "삭제할 팀 ID가 제공되지 않았습니다.");
    }

    try {
        const user = jwt.verify(accessToken, process.env.JWT_SECRET);
        teamId = decryptData(teamId);

        await withTransaction(async (client) => {
            // 팀 존재 여부 확인
            const { rows: teamRows } = await client.query(
                'SELECT logo_url FROM kbo_team_master WHERE id = $1',
                [teamId]
            );

            if (teamRows.length === 0) {
                return sendBadRequest(res, "존재하지 않는 팀입니다.");
            }

            const logoFileId = teamRows[0].logo_url;

            // 파일 삭제
            if (logoFileId) {
                const { rows: fileRows } = await client.query(
                    'SELECT path FROM file_table WHERE file_id = $1',
                    [logoFileId]
                );

                for (const file of fileRows) {
                    await deleteFile(file.path);
                }

                await client.query(
                    'DELETE FROM file_table WHERE file_id = $1',
                    [logoFileId]
                );
            }

            // 팀 삭제
            await client.query(
                'DELETE FROM kbo_team_master WHERE id = $1',
                [teamId]
            );

            return sendSuccess(res, "팀이 성공적으로 삭제되었습니다.");
        });
    } catch (error) {
        return sendServerError(res, error, "팀 삭제 중 오류가 발생했습니다.");
    }
};
