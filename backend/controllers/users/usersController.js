import {query} from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import bcrypt from 'bcrypt';

export const signup = async (req, res) => {
    const { email, password, nickname, profileImage, profileBio, favoriteTeam } = req.body;

    if (!email || !password || !nickname) {
        return sendBadRequest(res, {
            message : '이메일, 비밀번호, 닉네임은 필수 입력입니다.'
            , code  : -2
        });
    }

    try {
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
            INSERT INTO user_master (email, password_hash, nickname, profile_image, profile_bio, favorite_team)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING user_id, email, nickname
        `;

        const values = [email, hashedPassword, nickname, profileImage || null, profileBio || null, favoriteTeam || null];
        const result = await query(insertQuery, values);

        return sendSuccess(res, {
            message: '회원가입 성공',
            user: result.rows[0]
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