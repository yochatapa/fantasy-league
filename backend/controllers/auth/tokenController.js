import jwt from 'jsonwebtoken';
import { query } from '../../db.js';  // DB 쿼리 함수
import dotenv from 'dotenv';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'; // apiResponse에서 임포트

dotenv.config();

// /api/auth/check-token 라우터 핸들러
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
            `SELECT * FROM user_master WHERE user_id = $1 LIMIT 1`,
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
        return sendSuccess(res, {
            message: '토큰 검증 성공',
            user: {
                user_id: user.user_id,
                email: user.email,
                nickname: user.nickname,
                // profileImage: user.profile_image,
                // profileBio: user.profile_bio,
                // favoriteTeam: user.favorite_team,
            },
        });
    } catch (error) {
        console.error('토큰 검증 오류:', error);
        return sendServerError(res, error, '토큰이 유효하지 않거나 만료되었습니다.');
    }
};
