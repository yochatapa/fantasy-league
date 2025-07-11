import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';

export const getNotificationList = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let user;
    try {
        user = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (err) {
        return sendBadRequest(res, '유효하지 않은 토큰입니다.');
    }

    const userId = user.userId;

    try {
        let notifications = [];

        await withTransaction(async (client) => {
            const result = await client.query(`
                SELECT 
                    id, type, title, message, status, url,
                    related_id, related_type, created_at
                FROM notifications
                WHERE user_id = $1 AND is_deleted = false
                ORDER BY created_at DESC
                LIMIT 30
            `, [userId]);

            notifications = result.rows;
        });

        return sendSuccess(res, {
            message: '알림 목록이 성공적으로 조회되었습니다.',
            notifications ,
        });
    } catch (error) {
        return sendServerError(res, error, '알림 목록 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

export const markNotificationAsRead = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    const { id } = req.body;

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let user;
    try {
        user = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (err) {
        return sendBadRequest(res, '유효하지 않은 토큰입니다.');
    }

    if (!id) {
        return sendBadRequest(res, '알림 ID가 제공되지 않았습니다.');
    }

    try {
        await withTransaction(async (client) => {
            const updateResult = await client.query(`
                UPDATE notifications
                SET status = 'read',
                    read_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2 AND is_deleted = false
            `, [id, user.userId]);

            if (updateResult.rowCount === 0) {
                return sendBadRequest(res, '해당 알림이 없거나 이미 처리되었습니다.');
            }
        });

        return sendSuccess(res, {
            message: '알림이 성공적으로 읽음 처리되었습니다.',
        });
    } catch (error) {
        return sendServerError(res, error, '알림 읽음 처리 중 오류가 발생했습니다.');
    }
};