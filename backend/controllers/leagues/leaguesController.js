import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import { encryptData, decryptData } from '../../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';

export const createLeague = async (req, res) => {
    const { leagueName, leagueType, leagueFormat, draftMethod, isPublic, maxTeams, playoffTeams, seasonStartDate, draftDate } = req.body;

    // 필요한 값들이 존재하는지 확인
    // if (!leagueName || !leagueType || !leagueFormat || !seasonStartDate || !draftDate) {
    //     return sendBadRequest(res, '필수 값들이 누락되었습니다.');
    // }
    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        await withTransaction(async (client) => {
            // league_master 테이블에 데이터 저장
            const insertLeagueMaster = `
                INSERT INTO league_master 
                (
                    league_name
                    , is_public
                    , allow_clone
                    , league_type
                    , league_format
                    , commissioner_id
                    , join_approval_type
                    , invite_code
                    , status
                    , created_at
                    , updated_at
                )
                VALUES 
                (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING league_id;
            `;

            const invite_code = uuidv4();
            
            const leagueResult = await client.query(insertLeagueMaster, [
                leagueName, isPublic || true, false, leagueType, leagueFormat, user.userId, isPublic?'open':'invite', invite_code, 'active'
            ]);

            const leagueId = leagueResult.rows[0].league_id;

            // league_season 테이블에 데이터 저장
            const insertLeagueSeason = `
                INSERT INTO league_season (
                    league_id
                    , season_year
                    , max_teams
                    , playoff_teams
                    , foreign_player_limit
                    , start_date
                    , draft_date
                    , draft_type
                    , draft_timer
                    , allow_auto_draft
                    , allow_trades
                    , trade_deadline
                    , waiver_clear_days
                    , allow_matchup_reset
                    , injured_list_slots
                    , tie_breaker
                    , lineup_change_restriction
                    , season_status
                    , created_at
                    , updated_at
                )
                VALUES ($1, DATE_PART('year', CURRENT_DATE), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING season_id;
            `;

            const seasonResult = await client.query(insertLeagueSeason, [
                leagueId
                , maxTeams
                , playoffTeams
                , 0
                , seasonStartDate
                , draftDate
                , draftMethod
                , 30
                , true
                , true
                , null
                , 1
                , false
                , 0
                , 'rank'
                , 'none'
                , 'pending'
            ]);

            const seasonId = seasonResult.rows[0].season_id;

            console.log("seasonId",seasonId)

            // league_commissioner 저장 (리그 생성자가 커미셔너리 역할)
            const insertLeagueCommissioner = `
                INSERT INTO league_commissioner (
                    league_id
                    , user_id
                    , is_primary
                    , created_at
                    , updated_at
                )
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            `;
            await client.query(insertLeagueCommissioner, [leagueId, user.userId, true]);

            // league_season_team 저장 (초기에는 생성자만 참가)
            const insertLeagueTeam = `
                INSERT INTO league_season_team (
                    league_id
                    , season_id
                    , user_id
                    , team_name
                    , created_at
                    , updated_at
                )
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            `;
            await client.query(insertLeagueTeam, [leagueId, seasonId, user.userId, user.nickname]);

            // league_season_roster_slot 저장 (초기 설정)
            const insertLeagueRosterSlot = `
                INSERT INTO league_season_roster_slot (
                    league_id, season_id, position, slot_count, created_at
                )
                VALUES 
                    ($1, $2, 'C', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, '1B', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, '2B', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, '3B', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, 'SS', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, 'LF', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, 'CF', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, 'RF', 1, CURRENT_TIMESTAMP)
                    , ($1, $2, 'BUTIL', 2, CURRENT_TIMESTAMP)
                    , ($1, $2, 'SP', 3, CURRENT_TIMESTAMP)
                    , ($1, $2, 'RP', 5, CURRENT_TIMESTAMP)
                    , ($1, $2, 'PUTIL', 2, CURRENT_TIMESTAMP);
            `;
            await client.query(insertLeagueRosterSlot, [leagueId, seasonId]);

            // league_season_stat_setting 저장 (초기 설정)
            const insertLeagueStatSetting = `
                INSERT INTO league_season_stat_setting (
                    league_id
                    , season_id
                    , stat
                    , stat_value
                )
                VALUES 
                    ($1, $2, 'R', 1)
                    , ($1, $2, 'H', 1)
                    , ($1, $2, '2B', 2)
                    , ($1, $2, 'HR', 4)
                    , ($1, $2, 'RBI', 1)
                    , ($1, $2, 'SB', 1)
                    , ($1, $2, 'E', -1)
                    , ($1, $2, 'IP', 1)
                    , ($1, $2, 'W', 5)
                    , ($1, $2, 'L', -5)
                    , ($1, $2, 'ER', -1)
                    , ($1, $2, 'SV', 3)
                    , ($1, $2, 'HLD', 2)
                    , ($1, $2, 'HLD', 1)
                    , ($1, $2, 'K', 1);
            `;
            await client.query(insertLeagueStatSetting, [leagueId, seasonId]);

            return sendSuccess(res, {
                message: '리그가 성공적으로 생성되었습니다.',
                leagueId,
                seasonId
            });

        });
    } catch (error) {
        return sendServerError(res, error, '리그 생성 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};



export const getLeagueInfo = async (req, res) => {
    let { leagueId, seasonId } = req.query;

    leagueId = decryptData(leagueId)
    if(seasonId) seasonId = decryptData(seasonId)

    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        let leagueInfoQuery = `
            SELECT
                lm.league_id 
                , lm.league_name 
                , lm.description
                , lm.is_public
                , lm.allow_clone
                , lm.league_type 
                , lm.league_format
                , lm.commissioner_id
                , lm.join_approval_type
                , lm.invite_code
                , lm.icon_url
                , lm.banner_url
                , lm.status
                , ls.season_id 
                , ls.season_year
                , ls.max_teams
                , ls.playoff_teams
                , ls.foreign_player_limit 
                , ls.start_date 
                , ls.draft_date
                , ls.draft_type
                , ls.draft_timer 
                , ls.allow_auto_draft
                , ls.allow_trades
                , ls.trade_deadline 
                , ls.waiver_clear_days 
                , ls.allow_matchup_reset 
                , ls.injured_list_slots
                , ls.tie_breaker
                , ls.lineup_change_restriction 
                , ls.season_status
            FROM league_master lm 
                INNER JOIN league_season ls 
                    ON lm.league_id = ls.league_id`
        if(seasonId){
            leagueInfoQuery += ` AND ls.season_id = $2`
        }
        
            leagueInfoQuery += ` WHERE lm.league_id = $1`;

        if(!seasonId) leagueInfoQuery += ` ORDER BY season_year desc LIMIT 1`;

        const param = [leagueId];

        if(seasonId) param.push(seasonId)

        const leagueInfo = await query(leagueInfoQuery, param);

        if(leagueInfo.rows[0])
            return sendSuccess(res, {
                message: '리그 정보가 조회되었습니다.',
                leagueInfo : leagueInfo.rows[0]
            });
        else return sendBadRequest(res, '리그 정보가 없습니다.');
    } catch (error) {
        return sendServerError(res, error, '리그 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const getLeagueList = async (req, res) => {
    let { leagueId, seasonId } = req.query;

    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        const leagueListQuery = `
            SELECT
                lm.league_id 
                , lm.league_name 
                , lm.description
                , lm.is_public
                , lm.allow_clone
                , lm.league_type 
                , lm.league_format
                , lm.commissioner_id
                , lm.join_approval_type
                , lm.invite_code
                , lm.icon_url
                , lm.banner_url
                , lm.status
                , ls.season_id 
                , ls.season_year
                , ls.max_teams
                , ls.playoff_teams
                , ls.foreign_player_limit 
                , ls.start_date 
                , ls.draft_date
                , ls.draft_type
                , ls.draft_timer 
                , ls.allow_auto_draft
                , ls.allow_trades
                , ls.trade_deadline 
                , ls.waiver_clear_days 
                , ls.allow_matchup_reset 
                , ls.injured_list_slots
                , ls.tie_breaker
                , ls.lineup_change_restriction 
                , ls.season_status
                , (	SELECT 
                		count(*) 
                	FROM league_season_team 
                	WHERE league_id = lm.league_id 
                		AND season_id = ls.season_id ) AS team_count
            FROM league_season_team lst
            	INNER JOIN league_master lm ON lst.league_id = lm.league_id 
                INNER JOIN league_season ls 
                    ON lst.season_id  = ls.season_id
            WHERE lst.user_id = $1
            	AND ls.season_year = DATE_PART('year', CURRENT_DATE)
            	AND lm.status <> 'inactive'
        `;

        const leagueInfo = await query(leagueListQuery, [user.userId]);

        if(leagueInfo.rows[0])
            return sendSuccess(res, {
                message: '리그 목록이 조회되었습니다.',
                leagueInfo : leagueInfo.rows
            });
        else return sendBadRequest(res, '리그 목록이 없습니다.');
    } catch (error) {
        //return sendServerError(res, error, '리그 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}
