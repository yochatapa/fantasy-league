import jwt from 'jsonwebtoken'
import { query } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'

export const getKboGameSchedules = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1]
    const limit = parseInt(req.params.limit, 10) || 5

    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.')

    try {
        jwt.verify(accessToken, process.env.JWT_SECRET)

        const today = new Date().toISOString().split('T')[0].split('-').join('.');
        console.log('today',new Date())
        const { rows } = await query(`
            SELECT
                kgm.id,
                kgm.game_date,
                kgm.game_time,
                kgm.home_team_score,
                kgm.away_team_score,
                kgm.status,
                kgm.stadium AS location,
                -- kgm.current_inning,
                hti.name AS home_team,
                ati.name AS away_team,
                fth.path AS home_team_path,
                fth.mimetype AS home_team_mimetype,
                fta.path AS away_team_path,
                fta.mimetype AS away_team_mimetype
            FROM kbo_game_master kgm
            LEFT JOIN kbo_team_master hti ON kgm.home_team_id = hti.id
            LEFT JOIN kbo_team_master ati ON kgm.away_team_id = ati.id
            LEFT JOIN file_table fth ON fth.file_id = hti.logo_url::uuid AND fth.sn = 1
            LEFT JOIN file_table fta ON fta.file_id = ati.logo_url::uuid AND fta.sn = 1
            WHERE kgm.game_date = $1
            ORDER BY kgm.game_time ASC
        `, [today]);

        return sendSuccess(res, {
            message : "KBO 경기 일정을 성공적으로 조회하였습니다.",
            gameSchedules : rows
        })

    } catch (error) {
        return sendServerError(res, error, 'KBO 경기 일정 조회 중 오류가 발생했습니다.')
    }
}