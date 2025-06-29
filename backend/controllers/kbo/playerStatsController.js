import jwt from 'jsonwebtoken'
import { query } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'

// 타자 통계 API
export const getTopBatters = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1]
    const limit = parseInt(req.params.limit, 10) || 5

    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.')

    try {
        jwt.verify(accessToken, process.env.JWT_SECRET)

        const statTypes = [
            { key: 'avg', label: '타율', unit: '', column: 'ROUND(CAST(hits AS NUMERIC) / NULLIF(at_bats, 0), 3)' }, // 타율은 계산
            { key: 'hr', label: '홈런', unit: '개', column: 'home_runs' },
            { key: 'rbi', label: '타점', unit: '점', column: 'runs_batted_in' },
            { key: 'sb', label: '도루', unit: '개', column: 'stolen_bases' }
        ]

        const result = []

        for (const stat of statTypes) {
            const order = stat.key === 'avg' ? 'DESC' : 'DESC'
            const sql = `
                SELECT 
                    pm.name,
                    kt.name AS team,
                    ${stat.column} AS value
                FROM batter_season_stats bss
                JOIN kbo_player_master pm ON pm.id = bss.player_id
                JOIN kbo_player_season ps ON ps.player_id = bss.player_id AND ps.year = bss.season_year
                JOIN kbo_team_master kt ON kt.id = ps.team_id
                WHERE bss.season_year = EXTRACT(YEAR FROM CURRENT_DATE)
                    AND at_bats > 0
                ORDER BY ${stat.column} ${order}
                LIMIT $1
            `
            const { rows } = await query(sql, [limit])
            result.push({
                key: stat.key,
                label: stat.label,
                unit: stat.unit,
                topPlayers: rows
            })
        }

        return sendSuccess(res, result)

    } catch (error) {
        return sendServerError(res, error, '타자 TOP 통계 조회 중 오류가 발생했습니다.')
    }
}


// 투수 통계 API
export const getTopPitchers = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1]
    const limit = parseInt(req.params.limit, 10) || 5

    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.')

    try {
        jwt.verify(accessToken, process.env.JWT_SECRET)

        const statTypes = [
            { key: 'era', label: '평균자책', unit: '', column: 'ROUND(CAST(earned_runs AS NUMERIC) * 9 / NULLIF(outs_pitched, 0) * 3, 2)', asc: true },
            { key: 'win', label: '승수', unit: '승', column: 'wins' },
            { key: 'so', label: '탈삼진', unit: '개', column: 'strikeouts' },
            { key: 'sv', label: '세이브', unit: '개', column: 'saves' }
        ]

        const result = []

        for (const stat of statTypes) {
            const order = stat.asc ? 'ASC' : 'DESC'
            const sql = `
                SELECT 
                    pm.name,
                    kt.name AS team,
                    ${stat.column} AS value
                FROM pitcher_season_stats pss
                JOIN kbo_player_master pm ON pm.id = pss.player_id
                JOIN kbo_player_season ps ON ps.player_id = pss.player_id AND ps.year = pss.season_year
                JOIN kbo_team_master kt ON kt.id = ps.team_id
                WHERE pss.season_year = EXTRACT(YEAR FROM CURRENT_DATE)
                    AND outs_pitched > 0
                ORDER BY ${stat.column} ${order}
                LIMIT $1
            `
            const { rows } = await query(sql, [limit])
            result.push({
                key: stat.key,
                label: stat.label,
                unit: stat.unit,
                topPlayers: rows
            })
        }

        return sendSuccess(res, result)

    } catch (error) {
        return sendServerError(res, error, '투수 TOP 통계 조회 중 오류가 발생했습니다.')
    }
}
