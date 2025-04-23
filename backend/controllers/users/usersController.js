import {query} from '../../db.js';

export const checkNickname = async (req, res) => {
    const { nickname } = req.query;

    if (!nickname) {
        return res.status(400).json({ message: '닉네임을 입력해주세요.' });
    }

    try {
        const sql = 'SELECT 1 FROM user_master WHERE nickname = $1 LIMIT 1';
        const values = [nickname];

        const result = await query(sql, values);

        const exists = result.rows.length > 0;

        res.status(200).json({ exists });
    } catch (error) {
        console.error('닉네임 중복 확인 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
};

export const checkEmail = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: '이메일을 입력해주세요.' });
    }

    try {
        const sql = 'SELECT 1 FROM user_master WHERE email = $1 LIMIT 1';
        const values = [email];

        const result = await query(sql, values);

        const exists = result.rows.length > 0;

        res.status(200).json({ exists });
    } catch (error) {
        console.error('이메일 중복 확인 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
};