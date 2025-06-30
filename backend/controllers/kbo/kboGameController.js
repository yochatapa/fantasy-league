import jwt from 'jsonwebtoken'
import { query } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'
import path from 'path'
import convertFileToBase64 from '../../utils/convertFileToBase64.js'

export const getKboGameSchedules = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1]
    const date = req.params.date

    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.')

    try {
        jwt.verify(accessToken, process.env.JWT_SECRET)

        const { rows } = await query(`
            SELECT
                kgm.id,
                kgm.game_date,
                TO_CHAR(kgm.game_time,'HH24:MI') AS game_time,
                COALESCE(kcs.home_score, kgm.home_team_score, 0) AS home_team_score,
                COALESCE(kcs.away_score, kgm.away_team_score, 0) AS away_team_score,
                kgm.status,
                kgm.stadium AS location,
                hti.name AS home_team,
                ati.name AS away_team,
                kcs.inning,
                kcs.inning_half,
                fth.path AS home_team_path,
                fth.mimetype AS home_team_mimetype,
                fta.path AS away_team_path,
                fta.mimetype AS away_team_mimetype
            FROM kbo_game_master kgm
            LEFT JOIN kbo_team_master hti ON kgm.home_team_id = hti.id
            LEFT JOIN kbo_team_master ati ON kgm.away_team_id = ati.id
            LEFT JOIN file_table fth ON fth.file_id = hti.logo_url::uuid AND fth.sn = 1
            LEFT JOIN file_table fta ON fta.file_id = ati.logo_url::uuid AND fta.sn = 1

            LEFT JOIN (
                SELECT DISTINCT ON (game_id)
                    game_id,
                    home_score,
                    away_score,
                    inning,
                    inning_half
                FROM kbo_game_current_stats
                ORDER BY game_id, id DESC
            ) kcs ON kgm.id = kcs.game_id

            WHERE kgm.game_date = $1
            ORDER BY
            CASE
                WHEN kgm.status = 'playball' THEN 1
                WHEN kgm.status = 'completed' THEN 2
                WHEN kgm.status = 'scheduled' THEN 3
                ELSE 4
            END, kgm.game_time ASC;
        `, [date]);

        // base64 로고 처리
        for (let i = 0; i < rows.length; i++) {
            const game = rows[i]

            if (game.home_team_path) {
                const filePath = path.join(process.cwd(), game.home_team_path)
                game.home_team_path = await convertFileToBase64(filePath, game.home_team_mimetype)
            }

            if (game.away_team_path) {
                const filePath = path.join(process.cwd(), game.away_team_path)
                game.away_team_path = await convertFileToBase64(filePath, game.away_team_mimetype)
            }
        }

        return sendSuccess(res, {
            message: "KBO 경기 일정을 성공적으로 조회하였습니다.",
            gameSchedules: rows
        })

    } catch (error) {
        return sendServerError(res, error, 'KBO 경기 일정 조회 중 오류가 발생했습니다.')
    }
}
