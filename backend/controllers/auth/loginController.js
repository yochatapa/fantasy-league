import { query, withTransaction } from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import convertFileToBase64 from '../../utils/convertFileToBase64.js'; // apiResponse에서 임포트
import path from 'path'; // 경로 처리 모듈

dotenv.config();

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return sendBadRequest(res, {
            message : '이메일이 입력되지 않았습니다.'
            , code  : -2
        });
    }

    if (!password) {
        return sendBadRequest(res, {
            message : '비밀번호가 입력되지 않았습니다.'
            , code  : -3
        });
    }

    try {
        await withTransaction(async (client) => {
            const checkUser = await client.query(
                `SELECT 
                    user_id, password_hash, email, nickname, path, mimetype
                FROM user_master um
                    LEFT JOIN file_table ft ON um.profile_image = ft.file_id and sn = 1
                WHERE email = $1
                LIMIT 1`,
                [email]
            );
          
            if (checkUser.rows.length === 0) {
                return sendBadRequest(res, {
                    message: '가입되지 않은 계정입니다.',
                    code: -4,
                });
            }
    
            const user = checkUser.rows[0];
    
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
            if (!isPasswordValid){
                return sendBadRequest(res, {
                    message: '비밀번호가 일치하지 않습니다.',
                    code: -5,
                });
            }
    
            // 만약 이메일 비밀번호가 있다면, 로그인 (jwt 사용)
    
            const accessToken = jwt.sign(
                {
                    userId: user.user_id,
                    email: user.email,
                    nickname: user.nickname,
                },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
    
            // Refresh Token 유효성 확인
            const existingRefreshToken = await client.query(
                `SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW() LIMIT 1`,
                [user.user_id]
            );
    
            let refreshToken;
    
            if (existingRefreshToken.rows.length > 0) {
                // 유효한 refreshToken이 있으면 그걸 사용하고 연장
                refreshToken = existingRefreshToken.rows[0].token;
    
                // refreshToken을 연장
                await client.query(
                    `UPDATE refresh_tokens SET expires_at = NOW() + INTERVAL '14 days' WHERE token = $1`,
                    [refreshToken]
                );
            } else {
                // 유효한 refreshToken이 없다면 새로 발급
                refreshToken = jwt.sign(
                    { userId: user.user_id },
                    process.env.JWT_SECRET,
                    { expiresIn: '14d' }
                );
    
                // 새로 발급한 refreshToken을 DB에 저장
                await client.query(
                    `INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '14 days')`,
                    [refreshToken, user.user_id]
                );
            }
    
            // 로그인 이력 저장
            await client.query(
                `INSERT INTO login_history (user_id, ip_address, user_agent, success)
                 VALUES ($1, $2, $3, $4)`,
                [
                    user.user_id,
                    req.ip || req.headers['x-forwarded-for'] || null,
                    req.headers['user-agent'] || null,
                    true
                ]
            );
    
            await client.query(
                `UPDATE user_master
                 SET 
                   last_login_at = NOW(),
                   last_login_ip = $2,
                   login_count = COALESCE(login_count, 0) + 1
                 WHERE user_id = $1`,
                [
                    user.user_id,
                    req.ip || req.headers['x-forwarded-for'] || null
                ]
            );
            
            // Refresh Token은 HttpOnly 쿠키로 설정
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // HTTPS 환경에서만 사용
                sameSite: process.env.NODE_ENV === 'production'?'None':'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
            });
    
            // 레거시 스타일 쿠키 (SameSite 속성 없음) 설정
            // res.cookie('legacyRefreshToken', refreshToken, {
            //     httpOnly: true,
            //     maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
            // });
    
            let base64Image = null;
    
            if(user.path){
                const filePath = path.join(process.cwd(), user.path);
    
                base64Image = await convertFileToBase64(filePath, user.mimetype);
            }
            
            return sendSuccess(res, {
                message: '로그인 성공',
                token : accessToken,
                user: {
                    userId: user.user_id,
                    email: user.email,
                    nickname: user.nickname,
                    profileImage : base64Image, 
                }
            });
        })
    } catch (error) {
        return sendServerError(res, error, '로그인 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};