import { query } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'

export const logout = async (req, res) => {
    try {
        // 쿠키에서 refreshToken 가져오기
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return sendBadRequest(res, {
                message: 'Refresh token이 없습니다.',
                code: -1
            });
        }

        // 해당 refreshToken을 DB에서 삭제
        await query(
            `DELETE FROM refresh_tokens WHERE token = $1`,
            [refreshToken]
        );

        // 클라이언트 쿠키도 제거
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict'
        });

        return sendSuccess(res, {
            message: '로그아웃 성공'
        });
    } catch (error) {
        return sendServerError(res, error, '로그아웃 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}
