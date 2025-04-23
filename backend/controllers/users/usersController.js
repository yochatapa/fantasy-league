import {query} from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';

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
        return sendServerError(res, error, '닉네임 중복 확인 에러:');
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
        return sendServerError(res, error, '이메일 중복 확인 에러:');
    }
};