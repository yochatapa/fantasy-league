import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import {query} from '../db.js';
import { sendSuccess, sendNoTokenRequest, sendInvalidTokenRequest } from '../utils/apiResponse.js';
import path from 'path'; // 경로 처리 모듈
import convertFileToBase64 from '../utils/convertFileToBase64.js'; // apiResponse에서 임포트

dotenv.config();

// JWT 토큰 검증 미들웨어
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader?.split(' ')[1];
    const refreshToken = req.cookies.refreshToken // || req.cookies.legacyRefreshToken;

    // 먼저 accessToken 검증
    if (accessToken) {
        try {
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
            req.user = decoded;
            return next(); // 유효한 accessToken이면 통과
        } catch (err) {
            // accessToken이 만료됐거나 유효하지 않으면 아래로 진행
        }
    }
    
    // accessToken이 없거나 유효하지 않으면 refreshToken 검사
    if (!refreshToken) {
        return sendNoTokenRequest(res);
    }
    
    try { 
        const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        // DB에서 refreshToken 존재 및 유효성 확인
        const result = await query(
            `SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW() LIMIT 1`,
            [refreshToken, decodedRefresh.userId]
        );
        
        if (result.rows.length === 0) {
            return sendInvalidTokenRequest(res);
        }

        // refreshToken이 유효하면 새 accessToken 발급
        // DB에서 최신 사용자 정보 조회
        const userResult = await query(
            `SELECT 
                user_id, email, nickname, path, mimetype
            FROM user_master um
                LEFT JOIN file_table ft ON um.profile_image = ft.file_id and sn = 1
            WHERE user_id = $1 LIMIT 1`,
            [decodedRefresh.userId]
        );
        
        if (userResult.rows.length === 0) {
            // 사용자를 찾을 수 없는 경우 (비활성화 등)
            return sendInvalidTokenRequest(res);
        }
        const currentUser = userResult.rows[0];
        
        // 새로운 액세스 토큰 발급 (최신 정보 사용)
        const newAccessToken = jwt.sign(
            {
                userId: currentUser.user_id,
                email: currentUser.email,
                nickname: currentUser.nickname,
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        
        // 새 토큰을 응답 헤더로 보내거나, 사용자에게 노출 (프론트에서 저장 필요)
        res.setHeader('x-access-token', newAccessToken);

        let base64Image = null;

        if(currentUser.path){
            const filePath = path.join(process.cwd(), currentUser.path);

            base64Image = await convertFileToBase64(filePath, currentUser.mimetype);
        }

        req.user = {
            userId: currentUser.user_id,    // DB에서 가져온 ID
            email: currentUser.email,       // DB에서 가져온 최신 이메일
            nickname: currentUser.nickname, // DB에서 가져온 최신 닉네임
            profileImage : base64Image, 
        };
        
        //next(); // 다음 라우터 실행
        sendSuccess(res, { 
            token : newAccessToken, 
            access : true,
            user : {
                userId: currentUser.user_id,    // DB에서 가져온 ID
                email: currentUser.email,       // DB에서 가져온 최신 이메일
                nickname: currentUser.nickname, // DB에서 가져온 최신 닉네임
                profileImage : base64Image, 
            }
        });
    } catch (err) {
        console.error(err)
        return sendInvalidTokenRequest(res);
    }
};

export default verifyToken;