import { query } from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import { decryptData } from '../../utils/crypto.js';

export const getDraftRoomInfo = async (req, res) => {
    try {
        let { leagueId, seasonId } = req.params;

        if (!leagueId || !seasonId) {
            return sendBadRequest(res, '요청 파라미터가 부족합니다.');
        }

        // 복호화
        leagueId = decryptData(decodeURIComponent(leagueId));
        seasonId = decryptData(decodeURIComponent(seasonId));

        // 1. 드래프트 룸 조회
        const draftRoomQuery = `
            SELECT 
                dr.*,
                lsdm.draft_type
            FROM draft_rooms dr
                inner join league_season_draft_master lsdm ON lsdm.league_id = dr.league_id AND lsdm.season_id = dr.season_id
            WHERE dr.league_id = $1 AND dr.season_id = $2
            ORDER BY id DESC
            LIMIT 1
        `;
        const draftRoomResult = await query(draftRoomQuery, [leagueId, seasonId]);

        if (!draftRoomResult.rows[0]) {
            return sendBadRequest(res, '드래프트 룸 정보가 없습니다.');
        }
        const draftRoom = draftRoomResult.rows[0];

        // 2. 시즌 정보 (season_year 필요)
        const seasonResult = await query(
            `SELECT season_id, season_year FROM league_season WHERE league_id = $1 AND season_id = $2`,
            [leagueId, seasonId]
        );

        if (!seasonResult.rows[0]) {
            return sendBadRequest(res, '리그 시즌 정보가 없습니다.');
        }
        const seasonInfo = seasonResult.rows[0];

        // 3. 드래프트 순서 조회
        const draftOrderQuery = `
            SELECT
                dt.team_id,
                dt.draft_order,
                dt.is_auto_draft,
                um.user_id,
                um.nickname,
                lst.team_name,
                lst.logo_url
            FROM league_season_draft_teams dt
            INNER JOIN league_season_team lst ON dt.team_id = lst.id
            INNER JOIN user_master um ON lst.user_id = um.user_id
            WHERE dt.league_id = $1 AND dt.season_id = $2
            ORDER BY dt.draft_order ASC
        `;
        const draftOrderResult = await query(draftOrderQuery, [leagueId, seasonId]);

        if (draftOrderResult.rows.length === 0) {
            return sendBadRequest(res, '드래프트 팀 정보가 없습니다.');
        }

        // 4. 드래프트 결과 조회
        const draftResultQuery = `
            SELECT
                dr.team_id,
                dr.round,
                dr.pick_order,
                dr.player_id,
                kpm.name AS player_name,
                dr.player_original_positions AS primary_position -- Use player_original_positions directly
            FROM draft_results dr
            INNER JOIN kbo_player_master kpm ON dr.player_id = kpm.id
            WHERE dr.draft_room_id = $1
        `;
        const draftResultData = await query(draftResultQuery, [draftRoom.id]);

        const draftResults = {};
        for (const row of draftResultData.rows) {
            if (!draftResults[row.team_id]) draftResults[row.team_id] = [];
            draftResults[row.team_id].push({
                round: row.round,
                pick_order: row.pick_order,
                player_id: row.player_id,
                name: row.player_name,
                position: row.primary_position,
            });
        }

        // 5. 전체 선수 목록 (해당 시즌 기준) + 지난 시즌 스탯
        const playerQuery = `
            SELECT 
                pm.id AS player_id,
                pm.name,
                ps.team_id,
                ktm.name as team_name,
                ps.position AS season_position,
                pm.primary_position,
                pm.player_type,
                ps.uniform_number,
                ps.profile_image,
                pm.main_profile_image,

                -- 배터 스탯 전체 컬럼
                COALESCE(bs.games_played, 0) AS games_played,
                COALESCE(bs.plate_appearances, 0) AS plate_appearances,
                COALESCE(bs.at_bats, 0) AS at_bats,
                COALESCE(bs.hits, 0) AS hits,
                COALESCE(bs.singles, 0) AS singles,
                COALESCE(bs.doubles, 0) AS doubles,
                COALESCE(bs.triples, 0) AS triples,
                COALESCE(bs.home_runs, 0) AS home_runs,
                COALESCE(bs.runs_batted_in, 0) AS runs_batted_in,
                COALESCE(bs.runs, 0) AS runs,
                COALESCE(bs.walks, 0) AS walks,
                COALESCE(bs.intentional_walks, 0) AS intentional_walks,
                COALESCE(bs.strikeouts, 0) AS strikeouts,
                COALESCE(bs.hit_by_pitch, 0) AS hit_by_pitch,
                COALESCE(bs.sacrifice_bunts, 0) AS sacrifice_bunts,
                COALESCE(bs.sacrifice_flies, 0) AS sacrifice_flies,
                COALESCE(bs.stolen_bases, 0) AS stolen_bases,
                COALESCE(bs.grounded_into_double_play, 0) AS grounded_into_double_play,
                COALESCE(bs.errors, 0) AS errors,
                COALESCE(bs.left_on_base, 0) AS left_on_base,
                COALESCE(bs.flyouts, 0) AS flyouts,
                COALESCE(bs.groundouts, 0) AS groundouts,
                COALESCE(bs.linedrives, 0) AS linedrives,
                COALESCE(bs.triple_play, 0) AS triple_play,
                COALESCE(bs.caught_stealings, 0) AS caught_stealings,
                COALESCE(bs.pickoffs, 0) AS pickoffs,
                COALESCE(bs.intentional_base_on_balls, 0) AS intentional_base_on_balls,
                COALESCE(bs.fielders_choice, 0) AS fielders_choice,
                COALESCE(bs.grand_slams, 0) AS grand_slams,
                COALESCE(bs.solo_home_runs, 0) AS solo_home_runs,
                COALESCE(bs.two_run_home_runs, 0) AS two_run_home_runs,
                COALESCE(bs.three_run_home_runs, 0) AS three_run_home_runs,
                COALESCE(bs.go_ahead_rbi, 0) AS go_ahead_rbi,
                COALESCE(bs.walk_off, 0) AS walk_off,

                -- 배터 비율 스탯 (소수점 3자리, NULL -> 0.000)
                COALESCE(
                    CASE WHEN COALESCE(bs.at_bats,0) > 0 THEN ROUND(bs.hits::numeric / bs.at_bats, 3) ELSE NULL END
                , 0.000) AS batting_average,

                COALESCE(
                    CASE WHEN COALESCE(bs.plate_appearances,0) > 0 THEN ROUND((bs.hits + bs.walks + bs.hit_by_pitch)::numeric / bs.plate_appearances, 3) ELSE NULL END
                , 0.000) AS on_base_percentage,

                COALESCE(
                    CASE WHEN COALESCE(bs.at_bats,0) > 0 THEN ROUND((bs.singles + 2 * bs.doubles + 3 * bs.triples + 4 * bs.home_runs)::numeric / bs.at_bats, 3) ELSE NULL END
                , 0.000) AS slugging_percentage,

                COALESCE(
                    CASE WHEN COALESCE(bs.plate_appearances,0) > 0 AND COALESCE(bs.at_bats,0) > 0 THEN
                        ROUND(
                            ((bs.hits + bs.walks + bs.hit_by_pitch)::numeric / bs.plate_appearances) + 
                            ((bs.singles + 2 * bs.doubles + 3 * bs.triples + 4 * bs.home_runs)::numeric / bs.at_bats), 3
                        )
                    ELSE NULL END
                , 0.000) AS ops,

                -- 투수 스탯 전체 컬럼
                COALESCE(pss.games_played, 0) AS p_games_played,
                COALESCE(pss.games_started, 0) AS games_started,
                COALESCE(pss.outs_pitched, 0) AS outs_pitched,
                COALESCE(pss.batters_faced, 0) AS batters_faced,
                COALESCE(pss.pitches_thrown, 0) AS pitches_thrown,
                COALESCE(pss.hits_allowed, 0) AS hits_allowed,
                COALESCE(pss.singles_allowed, 0) AS singles_allowed,
                COALESCE(pss.doubles_allowed, 0) AS doubles_allowed,
                COALESCE(pss.triples_allowed, 0) AS triples_allowed,
                COALESCE(pss.home_runs_allowed, 0) AS home_runs_allowed,
                COALESCE(pss.runs_allowed, 0) AS runs_allowed,
                COALESCE(pss.earned_runs, 0) AS earned_runs,
                COALESCE(pss.walks_allowed, 0) AS walks_allowed,
                COALESCE(pss.intentional_walks_allowed, 0) AS intentional_walks_allowed,
                COALESCE(pss.hit_batters, 0) AS hit_batters,
                COALESCE(pss.hit_by_pitch_allowed, 0) AS hit_by_pitch_allowed,
                COALESCE(pss.intentional_base_on_balls, 0) AS intentional_base_on_balls,
                COALESCE(pss.strikeouts, 0) AS p_strikeouts,
                COALESCE(pss.wild_pitches, 0) AS wild_pitches,
                COALESCE(pss.balks, 0) AS balks,
                COALESCE(pss.wins, 0) AS wins,
                COALESCE(pss.losses, 0) AS losses,
                COALESCE(pss.saves, 0) AS saves,
                COALESCE(pss.holds, 0) AS holds,
                COALESCE(pss.blown_saves, 0) AS blown_saves,
                COALESCE(pss.flyouts, 0) AS p_flyouts,
                COALESCE(pss.groundouts, 0) AS p_groundouts,
                COALESCE(pss.linedrives, 0) AS p_linedrives,
                COALESCE(pss.grounded_into_double_play, 0) AS grounded_into_double_play,
                COALESCE(pss.triple_play, 0) AS triple_play,
                COALESCE(pss.pickoffs, 0) AS pickoffs,
                COALESCE(pss.quality_start, 0) AS quality_start,
                COALESCE(pss.complete_game, 0) AS complete_game,
                COALESCE(pss.shutout, 0) AS shutout,
                COALESCE(pss.perfect_game, 0) AS perfect_game,
                COALESCE(pss.no_hit, 0) AS no_hit,

                -- 투수 비율 스탯 (소수점 2자리, NULL -> 0.00)
                COALESCE(
                    CASE WHEN COALESCE(pss.outs_pitched,0) > 0 THEN ROUND((pss.earned_runs * 27)::numeric / pss.outs_pitched, 2) ELSE NULL END
                , 0.00) AS era,

                COALESCE(
                    CASE WHEN COALESCE(pss.outs_pitched,0) > 0 THEN ROUND((pss.strikeouts * 27)::numeric / pss.outs_pitched, 2) ELSE NULL END
                , 0.00) AS k_per_9,

                COALESCE(
                    CASE WHEN COALESCE(pss.outs_pitched,0) > 0 THEN ROUND((pss.walks_allowed * 27)::numeric / pss.outs_pitched, 2) ELSE NULL END
                , 0.00) AS bb_per_9,

                COALESCE(
                    CASE WHEN COALESCE(pss.outs_pitched,0) > 0 THEN ROUND((pss.hits_allowed * 27)::numeric / pss.outs_pitched, 2) ELSE NULL END
                , 0.00) AS hits_per_9,

                COALESCE(
                    CASE WHEN COALESCE(pss.outs_pitched,0) > 0 THEN ROUND(((pss.walks_allowed + pss.hits_allowed) * 3)::numeric / pss.outs_pitched, 2) ELSE NULL END
                , 0.00) AS whip

            FROM kbo_player_master pm
            INNER JOIN kbo_player_season ps ON pm.id = ps.player_id
            INNER JOIN kbo_team_master ktm ON ps.team_id = ktm.id
            LEFT JOIN batter_season_stats bs ON bs.player_id = pm.id AND bs.season_year = $1 - 1
            LEFT JOIN pitcher_season_stats pss ON pss.player_id = pm.id AND pss.season_year = $1 - 1
            WHERE ps.year = $1
            AND ps.is_active = true
            AND pm.is_retired = false
            ORDER BY pm.name ASC;
        `;
        const playerResult = await query(playerQuery, [seasonInfo.season_year]);

        // 6. 리그 정보 조회
        const leagueResult = await query(
            `SELECT league_id, league_name FROM league_master WHERE league_id = $1`,
            [leagueId]
        );

        // 7. 시즌별 스탯 설정 가져오기
        const statSettingResult = await query(
            `SELECT stat FROM league_season_stat_setting WHERE league_id = $1 AND season_id = $2`,
            [leagueId, seasonId]
        );
        const enabledStats = statSettingResult.rows.map(row => row.stat);

        // 10. 응답 반환
        return sendSuccess(res, {
            message: '드래프트 룸 정보가 조회되었습니다.',
            draftRoom,
            league: leagueResult.rows[0],
            season: seasonInfo,
            players: playerResult.rows,
            draftOrder: draftOrderResult.rows,
            draftResults,
            enabledStats
        });
    } catch (error) {
        console.error(error);
        return sendServerError(res, error, '드래프트 정보 조회 중 문제가 발생했습니다.');
    }
};
