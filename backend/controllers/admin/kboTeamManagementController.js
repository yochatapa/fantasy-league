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

        // 메인 쿼리 실행
        const kboTeamList = await query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY ktm.status, ktm.founding_year, ktm.disband_year, ktm.id) AS row_number,
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
    const { 
        name, code, founding_year, status, disband_year, logo
    } = req.body;

    const { newFiles = [], deletedFiles = [] } = logo;

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
    if (!name || !code || !founding_year || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
        return sendBadRequest(res, "status 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            // 1️⃣ 팀 마스터 테이블 저장
            const insertQuery = `
                INSERT INTO kbo_team_master (name, code, founding_year, status, disband_year, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                RETURNING id
            `;
            const { rows } = await client.query(insertQuery, [
                name, code, founding_year, status, disband_year || null
            ]);

            const teamId = rows[0].id;

            // 2️⃣ [Insert 처리] main_profile_image의 newFiles 처리
            if (newFiles.length > 0) {
                for (const newFile of newFiles) {
                    const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboTeam', teamId.toString(), 'logo');

                    const finalFileSavedInfo = await saveUploadedFile({
                        originalName: newFile.originalName,
                        filename: newFile.filename,
                        path: newFile.path,
                        size: newFile.size,
                        mimetype: newFile.mimetype
                    }, userSpecificUploadDir);

                    const finalFileUrlForDB = path.join(
                        'uploads',
                        'kboTeam',
                        teamId.toString(),
                        'logo',
                        finalFileSavedInfo.finalFileName
                    );

                    const mainProfileFileId = uuidv4();

                    const maxSn = await client.query(
                        "SELECT COALESCE(max(sn),0) as sn FROM file_table WHERE file_id = $1",
                        [mainProfileFileId]
                    );

                    await client.query(`
                        INSERT INTO file_table (
                            file_id, sn, original_name, unique_name,
                            mimetype, size, path, category, uploaded_by
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9
                        )
                    `, [
                        mainProfileFileId,
                        maxSn.rows[0].sn + 1,
                        newFile.originalName,
                        finalFileSavedInfo.finalFileName,
                        newFile.mimetype,
                        newFile.size,
                        finalFileUrlForDB,
                        'kboTeamLogo',
                        user.user_id
                    ]);

                    // kbo_team_master 테이블에 logo_url 업데이트 (file_id 저장)
                    await client.query(`
                        UPDATE kbo_team_master
                        SET logo_url = $1
                        WHERE id = $2
                    `, [mainProfileFileId, teamId]);
                }
            }

            // 팀 생성 완료 후 반환
            return sendSuccess(res, {
                message: "팀이 성공적으로 생성되었습니다.",
                teamId
            });
        });
    } catch (error) {
        let errorMessage;
        switch (error.message) {
            case "-1": errorMessage = "이미 존재하는 팀 코드입니다."; break;
        }
        return sendServerError(res, error, errorMessage ?? "팀 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};



export const updateKboTeam = async (req, res) => {
    const { name, code, founding_year, status, disband_year, logo } = req.body;
    const { newFiles = [], deletedFiles = [] } = logo;
    let { teamId } = req.params;

    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);
    teamId = decryptData(teamId);

    if (!teamId) {
        return sendBadRequest(res, "팀 정보가 잘못되었습니다.");
    }

    if (!name || !code || !founding_year || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
        return sendBadRequest(res, "status 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            const { rows: existing } = await client.query(
                'SELECT id, logo_url FROM kbo_team_master WHERE code = $1',
                [code]
            );

            if (existing.length > 0 && existing.find((row) => row.id !== teamId)) {
                throw new Error("-1");
            }

            const { rows: rows } = await client.query(
                'SELECT id, logo_url FROM kbo_team_master WHERE id = $1',
                [teamId]
            );

            console.log("rows",rows)

            const updateQuery = `
                UPDATE kbo_team_master SET
                    name = $2,
                    code = $3,
                    founding_year = $4,
                    status = $5,
                    disband_year = $6
                WHERE id = $1
            `;
            const params = [teamId, name, code, founding_year, status, disband_year || null];
            await client.query(updateQuery, params);

            /* 🔹 logo 파일 처리 */
            if (logo) {
                const generatedFileId = rows[0].logo_url ?? uuidv4();
                const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'kboTeam', teamId.toString(), 'logo');
                
                // [Delete 처리]
                for (const deletedFile of deletedFiles) {
                    const { rows: fileRows } = await client.query(
                        'SELECT path FROM file_table WHERE file_id = $1 and sn = $2',
                        [deletedFile.file_id, deletedFile.sn]
                    );
                    
                    for (const file of fileRows) {
                        await deleteFile(file.path);
                    }

                    await client.query(
                        'DELETE FROM file_table WHERE file_id = $1 and sn = $2',
                        [deletedFile.file_id, deletedFile.sn]
                    );
                }
                
                // [Insert 처리]
                for (const newFile of newFiles) {
                    console.log(newFile)
                    const finalFileSavedInfo = await saveUploadedFile({
                        originalName: newFile.originalName,
                        filename: newFile.filename,
                        path: newFile.path,
                        size: newFile.size,
                        mimetype: newFile.mimetype
                    }, userSpecificUploadDir);

                    const finalFileUrlForDB = path.join(
                        'uploads',
                        'kboTeam',
                        teamId.toString(),
                        'logo',
                        finalFileSavedInfo.finalFileName
                    );

                    const maxSn = await client.query(
                        "SELECT COALESCE(max(sn),0) as sn FROM file_table WHERE file_id = $1",
                        [generatedFileId]
                    );

                    await client.query(
                        `INSERT INTO file_table (
                            file_id, sn, original_name, unique_name,
                            mimetype, size, path, category, uploaded_by
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9
                        )`,
                        [
                            generatedFileId,
                            maxSn.rows[0].sn + 1,
                            newFile.originalName,
                            finalFileSavedInfo.finalFileName,
                            newFile.mimetype,
                            newFile.size,
                            finalFileUrlForDB,
                            'kboTeamLogo',
                            user.user_id
                        ]
                    );
                }

                if (!rows[0].logo_url) {
                    await client.query(`
                        UPDATE kbo_team_master
                        SET logo_url = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `, [generatedFileId, teamId]);
                }
            }
        });

        return sendSuccess(res, {
            message: "팀이 성공적으로 수정되었습니다."
        });
    } catch (error) {
        const errorMessage = error.message === "-1" ? "이미 존재하는 팀 코드입니다." : "팀 수정 중 오류가 발생했습니다. 다시 시도해주세요.";
        return sendServerError(res, error, errorMessage);
    }
};


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
                throw new Error("-1");
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
        let errorMessage;
        switch(error.message){
            case "-1" : errorMessage = "존재하지 않는 팀입니다."; break;
        }
        return sendServerError(res, error, errorMessage??"팀 삭제 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};
