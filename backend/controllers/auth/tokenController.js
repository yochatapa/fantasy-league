import jwt from 'jsonwebtoken';
import { query } from '../../db.js';  // DB 쿼리 함수
import dotenv from 'dotenv';
import path from 'path'; // 경로 처리 모듈
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'; // apiResponse에서 임포트
import convertFileToBase64 from '../../utils/convertFileToBase64.js'; // apiResponse에서 임포트


dotenv.config();

export const checkToken = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    
    if (!accessToken) {
        return sendBadRequest(res, {
            message: '토큰이 제공되지 않았습니다.',
            code: -1
        });
    }

    try {
        // accessToken을 검증하고, 유효한 경우 payload (userId, email 등) 추출
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        // 토큰이 유효하면, DB에서 해당 사용자 정보 조회
        const userResult = await query(
            `SELECT 
                user_id, email, nickname, path, mimetype, is_admin
            FROM user_master um
                LEFT JOIN file_table ft ON um.profile_image = ft.file_id and sn = 1
            WHERE user_id = $1 LIMIT 1`,
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return sendBadRequest(res, {
                message: '사용자를 찾을 수 없습니다.',
                code: -2
            });
        }

        const user = userResult.rows[0];

        // 파일 경로 가져오기 (profile_image 컬럼에 저장된 UUID로 파일 경로 생성)
        let base64Image = null;

        if(user.path){
            const filePath = path.join(process.cwd(), user.path);

            base64Image = await convertFileToBase64(filePath, user.mimetype);
        }

        // 성공적으로 인증된 사용자 정보 반환
        return sendSuccess(res, {
            message: '토큰 검증 성공',
            user: {
                userId: user.user_id,
                email: user.email,
                nickname: user.nickname,
                isAdmin : user.is_admin,
                profileImage : base64Image, // 파일 읽기 실패 시 null
            },
        });
        
    } catch (error) {
        console.error('토큰 검증 오류:', error);
        return sendServerError(res, error, '토큰이 유효하지 않거나 만료되었습니다.');
    }
};

export const checkAdmin = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    
    if (!accessToken) {
        return sendBadRequest(res, {
            message: '토큰이 제공되지 않았습니다.',
            code: -1
        });
    }

    try {
        // accessToken을 검증하고, 유효한 경우 payload (userId, email 등) 추출
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        // 토큰이 유효하면, DB에서 해당 사용자 정보 조회
        const userResult = await query(
            `SELECT 
                is_admin
            FROM user_master um
                LEFT JOIN file_table ft ON um.profile_image = ft.file_id and sn = 1
            WHERE user_id = $1 LIMIT 1`,
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return sendBadRequest(res, {
                message: '사용자를 찾을 수 없습니다.',
                code: -2
            });
        }

        const user = userResult.rows[0];

        // 성공적으로 인증된 사용자 정보 반환
        if(user.is_admin) 
            return sendSuccess(res, {
                message: '관리자 검증에 성공하였습니다.',
                isAdmin : user.is_admin,
            });
        else return sendBadRequest(res, {
            message: '관리자 검증에 실패하였습니다.',
            code: -3
        });
    } catch (error) {
        console.error('관리자 검증 오류:', error);
        return sendServerError(res, error, '관리자 검증 오류입니다.');
    }
};
