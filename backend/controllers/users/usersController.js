import bcrypt from 'bcrypt';
import path from 'path'; // 경로 처리 모듈
import {query, withTransaction} from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import { saveUploadedFile } from '../../utils/fileUploader.js';
import { v4 as uuidv4 } from 'uuid';

const finalUploadsBaseDir = path.join(process.cwd(), 'uploads');

export const signup = async (req, res) => {
    const { email, password, nickname, profileBio, favoriteTeam } = req.body;

    // 파일 정보
    const uploadedFilesInfo = req.filesInfo;
    const profileImageInfo = uploadedFilesInfo?.find(f => f.fieldName === 'profileImage');

    if (!email || !password || !nickname) {
        return sendBadRequest(res, {
            message : '이메일, 비밀번호, 닉네임은 필수 입력입니다.'
            , code  : -2
        });
    }

    try {
        await withTransaction(async (client) => {
            // 이메일 중복 체크
            const duplicateEmailCheck = await query(
                'SELECT 1 FROM user_master WHERE email = $1 LIMIT 1',
                [email]
            );

            if (duplicateEmailCheck.rows.length > 0) {
                return sendBadRequest(res, {
                    message : '이미 사용 중인 이메일입니다.'
                    , code  : -3
                });
            }

            // 닉네임 중복 체크
            const duplicateNicknameCheck = await query(
                'SELECT 1 FROM user_master WHERE nickname = $1 LIMIT 1',
                [nickname]
            );

            if (duplicateNicknameCheck.rows.length > 0) {
                return sendBadRequest(res, {
                    message : '이미 사용 중인 닉네임입니다.'
                    , code  : -4
                });
            }

            // 비밀번호 해시
            const hashedPassword = await bcrypt.hash(password, 10);

            // DB 저장
            const insertQuery = `
                INSERT INTO user_master (email, password_hash, nickname, profile_bio, favorite_team)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING user_id, email, nickname
            `;

            const values = [email, hashedPassword, nickname, profileBio || null, favoriteTeam || null];
            const result = await client.query(insertQuery, values);
            const createdUserId = result.rows[0].user_id;

            let finalFileSavedInfo = null; // saveUploadedFile 함수가 반환할 최종 파일 정보
            let finalFileUrlForDB = null; // DB file_path 컬럼에 저장할 경로/URL

            if (profileImageInfo && createdUserId !== null) { // 파일이 업로드되었고 유저 ID 발급된 경우
                const userSpecificUploadDir = path.join(finalUploadsBaseDir, 'users', createdUserId.toString(), 'profile');

                // saveUploadedFile 함수를 호출하여 파일 복사
                finalFileSavedInfo = await saveUploadedFile(profileImageInfo, userSpecificUploadDir);
                console.log('파일 복사 및 임시 삭제 완료:', finalFileSavedInfo);

                // DB에 저장할 파일 경로/URL 구성 (예: 프로젝트 루트 기준 상대 경로)
                finalFileUrlForDB = path.join('uploads', 'users', createdUserId.toString(), 'profile', finalFileSavedInfo.finalFileName);


                // 1. uuid file_id 생성
                const generatedFileId = uuidv4();

                // 2. 파일 정보 DB 저장 쿼리 실행
                const insertFileQuery = `
                    INSERT INTO file_table (
                        file_id, sn, original_name, unique_name,
                        mimetype, size, path, category, uploaded_by
                    ) VALUES (
                        $1, 1, $2, $3, $4, $5, $6, $7, $8
                    )
                `;

                await client.query(insertFileQuery, [
                    generatedFileId, // uuid
                    profileImageInfo.originalName,
                    finalFileSavedInfo.finalFileName,
                    profileImageInfo.mimetype,
                    profileImageInfo.size,
                    finalFileUrlForDB,
                    'profile',
                    createdUserId
                ]);

                // 3. user_master 테이블에 profile_image 컬럼 업데이트
                const updateUserQuery = `
                    UPDATE user_master
                    SET profile_image = $1
                    WHERE user_id = $2
                `;

                await client.query(updateUserQuery, [
                    generatedFileId, // profile_image는 uuid
                    createdUserId,
                ]);

            } else {
                // 파일이 업로드되지 않은 경우
                console.log("No profile image uploaded.");
            }
            
            return sendSuccess(res, {
                message: '회원가입 성공',
                user: result.rows[0]
            });

        });
    } catch (error) {
        return sendServerError(res, error, '회원가입 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

export const checkNickname = async (req, res) => {
    const { nickname } = req.query;

    if (!nickname) {
        return sendBadRequest(res,"닉네임을 입력해주세요.");
    }

    try {
        const sql = 'SELECT 1 FROM user_master WHERE nickname = $1 LIMIT 1';
        const values = [nickname];

        const result = await query(sql, values);

        const exists = result.rows.length > 0;

        return sendSuccess(res, { exists });
    } catch (error) {
        return sendServerError(res, error, '닉네임 중복 확인 에러입니다.');
    }
};

export const checkEmail = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return sendBadRequest(res,"이메일을 입력해주세요.");
    }

    try {
        const sql = 'SELECT 1 FROM user_master WHERE email = $1 LIMIT 1';
        const values = [email];

        const result = await query(sql, values);

        const exists = result.rows.length > 0;

        return sendSuccess(res, { exists });
    } catch (error) {
        return sendServerError(res, error, '이메일 중복 확인 에러입니다.');
    }
};