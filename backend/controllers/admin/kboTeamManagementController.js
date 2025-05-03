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
        let { page = 1, itemsPerPage = 10 } = req.query;

        // 페이지 및 항목 수를 숫자로 변환하고 최소값을 설정
        page = Math.max(1, parseInt(page, 10));
        itemsPerPage = Math.max(1, parseInt(itemsPerPage, 10));

        const offset = (page - 1) * itemsPerPage;

        // 팀 목록 조회 쿼리 (LIMIT, OFFSET 사용)
        const kboTeamList = await query(`
            SELECT
                *
            FROM kbo_team_master
            ORDER BY status, founding_year, disband_year, id
            LIMIT $1 OFFSET $2
        `, [itemsPerPage, offset]);

        // 총 팀 수 조회
        const totalTeams = await query(`
            SELECT COUNT(*) as total
            FROM kbo_team_master
        `);

        const total = totalTeams.rows[0].total;

        if (kboTeamList.rows.length > 0) {
            return sendSuccess(res, {
                message: "팀 목록을 성공적으로 조회하였습니다.",
                teamList: kboTeamList.rows,
                total 
            });
        } else {
            return sendBadRequest(res, "팀 목록 조회 중 문제가 발생하였습니다.");
        }
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

            return sendSuccess(res,{
                message : "팀이 성공적으로 생성되었습니다.",
                teamId
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

            if(existing.logo_url){
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

            return sendSuccess(res, "팀이 성공적으로 수정되었습니다.");
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
            FROM kbo_team_master ktm
            WHERE ktm.id = $1
        `;

        const param = [teamId];

        const teamInfo = await query(teamInfoQuery, param);

        let teamLogoInfoQuery = `
            SELECT
                ft.file_id
                , ft.sn
                , ft.original_name
                , ft.size
                , ft.path
                , ft.mimetype
            FROM file_table ft
                inner join kbo_team_master ktm on ft.file_id = ktm.logo_url::uuid
            WHERE ktm.id = $1
        `;

        const teamLogoInfo = await query(teamLogoInfoQuery, param);

        for(let idx=0;idx<teamLogoInfo.rows.length;idx++){
            const teamLogo = teamLogoInfo.rows[idx]
            let base64Image = null;
        
            if(teamLogo.path){
                const filePath = path.join(process.cwd(), teamLogo.path);
    
                base64Image = await convertFileToBase64(filePath, teamLogo.mimetype);
            }
            
            teamLogoInfo.rows[idx].path = base64Image
        }
        
        if(!teamInfo.rows[0])
            return sendBadRequest(res, '팀 정보가 없습니다.');

        return sendSuccess(res, {
            message: '팀 정보가 조회되었습니다.',
            teamInfo : teamInfo.rows[0],
            logoInfo : teamLogoInfo.rows
        });
    } catch (error) {
        return sendServerError(res, error, '팀 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}