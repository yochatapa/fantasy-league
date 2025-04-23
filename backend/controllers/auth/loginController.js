import {query} from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
        const checkUser = await query(
            `SELECT 
                * 
            FROM user_master 
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

        

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                nickname: user.nickname,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // 로그인 이력 저장
        
        await query(
            `INSERT INTO login_history (user_id, ip_address, user_agent, success)
             VALUES ($1, $2, $3, $4)`,
            [
                user.user_id,
                req.ip || req.headers['x-forwarded-for'] || null,
                req.headers['user-agent'] || null,
                true
            ]
        );

        await query(
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

        return sendSuccess(res, {
            message: '로그인 성공',
            token,
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
            }
        });
    } catch (error) {
        return sendServerError(res, error, '로그인 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};