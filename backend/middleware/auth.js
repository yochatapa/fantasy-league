import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { query, withTransaction} from '../db.js';
import { sendSuccess, sendBadRequest, sendServerError, sendNoTokenRequest, sendInvalidTokenRequest } from '../utils/apiResponse.js';
import path from 'path'; // 경로 처리 모듈
import convertFileToBase64 from '../utils/convertFileToBase64.js'; // apiResponse에서 임포트
import { decryptData } from '../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// JWT 토큰 검증 미들웨어
export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader?.split(' ')[1];
    const refreshToken = req.cookies.refreshToken;

    if (accessToken) {
        try {
            const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (err) {
            // accessToken 만료 또는 오류 시 아래로 진행
        }
    }

    if (!refreshToken) {
        return sendNoTokenRequest(res);
    }

    try {
        await withTransaction(async (client) => {
            const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_SECRET);

            const result = await query(
                `SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW() LIMIT 1`,
                [refreshToken, decodedRefresh.userId]
            );

            if (result.rows.length === 0) {
                return sendInvalidTokenRequest(res);
            }

            const refreshTokenExpiresAt = new Date(result.rows[0].expires_at);
            const now = new Date();
            const remainingTime = refreshTokenExpiresAt - now;

            let newRefreshToken = refreshToken;
            // 남은 시간이 7일 이하일 경우 새 refreshToken 발급 및 갱신
            if (remainingTime <= 7 * 24 * 60 * 60 * 1000) {
                newRefreshToken = jwt.sign(
                    { userId: decodedRefresh.userId, jti: uuidv4() },
                    process.env.JWT_SECRET,
                    { expiresIn: '14d' }
                );

                await client.query(
                    `UPDATE refresh_tokens SET expires_at = NOW() WHERE token = $1`,
                    [refreshToken]
                );

                await client.query(
                    `INSERT INTO refresh_tokens (token, user_id, expires_at)
                     VALUES ($1, $2, GREATEST($3, NOW()) + INTERVAL '14 days')`,
                    [newRefreshToken, decodedRefresh.userId, refreshTokenExpiresAt]
                );

                res.cookie('refreshToken', newRefreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
                    maxAge: 14 * 24 * 60 * 60 * 1000 // 14일
                });
            }

            const userResult = await query(
                `SELECT user_id, email, nickname, path, mimetype
                 FROM user_master um
                 LEFT JOIN file_table ft ON um.profile_image = ft.file_id AND sn = 1
                 WHERE user_id = $1 LIMIT 1`,
                [decodedRefresh.userId]
            );

            if (userResult.rows.length === 0) {
                throw new Error("사용자를 찾을 수 없습니다.");
            }

            const currentUser = userResult.rows[0];

            const newAccessToken = jwt.sign(
                {
                    userId: currentUser.user_id,
                    email: currentUser.email,
                    nickname: currentUser.nickname,
                },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            res.setHeader('x-access-token', newAccessToken);

            let base64Image = null;
            if (currentUser.path) {
                const filePath = path.join(process.cwd(), currentUser.path);
                base64Image = await convertFileToBase64(filePath, currentUser.mimetype);
            }

            req.user = {
                userId: currentUser.user_id,
                email: currentUser.email,
                nickname: currentUser.nickname,
                profileImage: base64Image,
            };

            sendSuccess(res, {
                token: newAccessToken,
                access: true,
                user: req.user
            });
        });
    } catch (err) {
        console.error(err);
        return sendInvalidTokenRequest(res);
    }
};

export default verifyToken;

export const verifyCommissioner = async (req, res, next) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    let { leagueId } = req.query;
    
    leagueId = decodeURIComponent(decryptData(leagueId))
    
    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        const commissionerList = await query(`
            SELECT 
                *
            FROM league_master lm
                INNER JOIN league_commissioner lc on lm.league_id = lc.league_id
            WHERE lm.league_id = $1
                AND lc.user_id = $2
        `, [leagueId, user.userId]
        )

        if(commissionerList.rows.length>0){
            next();
        } else return sendBadRequest(res, '리그 정보가 없습니다.');
    } catch (error) {
        return sendServerError(res, error, '리그 커미셔너 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');   
    }
}

export const verifyTeams = async (req, res, next) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    let { leagueId } = req.query;
    
    leagueId = decodeURIComponent(decryptData(leagueId))
    
    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        const commissionerList = await query(`
            SELECT 
                *
            FROM league_master lm
                INNER JOIN league_season ls ON lm.league_id = ls.league_id
                INNER JOIN league_season_team lst ON lm.league_id = lst.league_id AND ls.season_id = lst.season_id
            WHERE lm.league_id = $1
                AND lst.user_id = $2
            ORDER BY ls.season_year DESC
            LIMIT 1;
        `, [leagueId, user.userId]
        )

        if(commissionerList.rows.length>0){
            next();
        } else return sendBadRequest(res, '리그 정보가 없습니다.');
    } catch (error) {
        return sendServerError(res, error, '리그 커미셔너 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');   
    }
}


export const verifyAdmin = async (req, res, next) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출
    
    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        const adminResult = await query(`
            SELECT 
                is_admin
            FROM user_master
            WHERE user_id = $1
        `, [user.userId]
        )

        if(adminResult.rows[0].is_admin){
            next();
        } else return sendBadRequest(res, {
            message : '관리자가 아닙니다.'
            , code : -99
        });
    } catch (error) {
        return sendServerError(res, error, '관리자 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');   
    }
}