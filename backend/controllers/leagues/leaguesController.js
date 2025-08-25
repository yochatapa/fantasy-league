import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import { encryptData, decryptData } from '../../utils/crypto.js';
import { generateUniqueCode } from '../../utils/randomCodeGenerator.js';
import activeDraftRooms from '../../utils/draft/activeDraftRooms.js';
import dayjs from 'dayjs';

export const createLeague = async (req, res) => {
    const { leagueName, leagueType, leagueFormat, draftMethod, isPublic, maxTeams, playoffTeams, seasonStartDate, draftDate, draftTime } = req.body;

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

            const checkInviteCodeUnique = async (code) => {
                const result = await client.query(
                    'SELECT * FROM league_master WHERE invite_code = $1',
                    [code]
                );
                return result.rows.length === 0; // true면 사용 가능
            }

            const invite_code = await generateUniqueCode(checkInviteCodeUnique);
            
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
                VALUES ($1, DATE_PART('year', CURRENT_DATE), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING season_id;
            `;

            const seasonResult = await client.query(insertLeagueSeason, [
                leagueId
                , maxTeams
                , playoffTeams
                , 0
                , seasonStartDate
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
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id;
            `;
            const leagueTeamResult = await client.query(insertLeagueTeam, [leagueId, seasonId, user.userId, user.nickname]);

            const leagueTeamId = leagueTeamResult.rows[0].id;

            const insertDraftMaster = `
                INSERT INTO league_season_draft_master (
                    league_id,
                    season_id,
                    draft_start_date,
                    draft_type,
                    draft_timer,
                    allow_auto_draft,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            `;

            console.log("draftDate",draftDate)

            await client.query(insertDraftMaster, [
                leagueId,
                seasonId,   
                draftDate,  
                draftMethod,
                30          
            ]);

            // league_season_draft_teams 테이블에 1번 픽 팀 등록
            const insertDraftTeam = `
                INSERT INTO league_season_draft_teams (
                    league_id,
                    season_id,
                    team_id,
                    draft_order,
                    is_auto_draft,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, 1, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            `;

            await client.query(insertDraftTeam, [
                leagueId,
                seasonId,
                leagueTeamId // ← 드래프트 1번픽 팀 ID
            ]);

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
                    , ($1, $2, 'UTIL', 2, CURRENT_TIMESTAMP)
                    , ($1, $2, 'SP', 3, CURRENT_TIMESTAMP)
                    , ($1, $2, 'RP', 5, CURRENT_TIMESTAMP)
                    , ($1, $2, 'P', 2, CURRENT_TIMESTAMP);
            `;
            await client.query(insertLeagueRosterSlot, [leagueId, seasonId]);

            // league_season_stat_setting 저장 (초기 설정)
            const insertLeagueStatSetting = `
                INSERT INTO league_season_stat_setting (
                    league_id, season_id, stat, stat_value
                )
                VALUES 
                    ($1, $2, 'runs', 1)
                    , ($1, $2, 'hits', 1)
                    , ($1, $2, 'doubles', 2)
                    , ($1, $2, 'home_runs', 4)
                    , ($1, $2, 'runs_batted_in', 1)
                    , ($1, $2, 'stolen_bases', 1)
                    , ($1, $2, 'errors', -1)
                    , ($1, $2, 'outs_pitched', 1)
                    , ($1, $2, 'wins', 5)
                    , ($1, $2, 'losses', -5)
                    , ($1, $2, 'earned_runs', -1)
                    , ($1, $2, 'saves', 3)
                    , ($1, $2, 'holds', 2)
                    , ($1, $2, 'strikeouts', 1);
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
    let { leagueId } = req.params;

    leagueId = decryptData(leagueId)
    
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
            FROM league_master lm
            WHERE lm.league_id = $1`;

        const param = [leagueId];

        const leagueInfo = await query(leagueInfoQuery, param);
        
        if(!leagueInfo.rows[0])
            return sendBadRequest(res, '리그 정보가 없습니다.');

        const leagueSeasonYearQuery = `
            SELECT
                ls.season_year,
                ls.season_id
            FROM league_master lm
                INNER JOIN league_season ls
                    ON lm.league_id = ls.league_id
            WHERE lm.league_id = $1
            ORDER BY ls.season_year DESC
        `;

        const leagueSeasonYearResult = await query(leagueSeasonYearQuery,[leagueId])

        if(leagueSeasonYearResult.rows.length === 0)
            return sendBadRequest(res, '리그 시즌 정보가 없습니다.');

        return sendSuccess(res, {
            message: '리그 정보가 조회되었습니다.',
            leagueInfo : leagueInfo.rows[0]
            , seasonInfo : leagueSeasonYearResult.rows
        });
    } catch (error) {
        return sendServerError(res, error, '리그 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const getCurrentSeasonInfo = async (req, res) => {
    let { leagueId } = req.params;

    leagueId = decryptData(leagueId)
    
    try {
        const leagueInfoQuery = `
            SELECT
                ls.season_id,
                ls.season_year,
                ls.max_teams,
                ls.playoff_teams,
                ls.foreign_player_limit,
                TO_CHAR(ls.start_date, 'YYYY.MM.DD') AS start_date,
                ls.allow_trades,
                TO_CHAR(ls.trade_deadline, 'YYYY.MM.DD HH24:MI') AS trade_deadline,
                ls.waiver_clear_days,
                ls.allow_matchup_reset,
                ls.injured_list_slots,
                ls.tie_breaker,
                ls.lineup_change_restriction,
                ls.season_status,

                -- draft information
                draft_start_date,
                -- TO_CHAR(d.draft_start_time, 'HH24:MI') AS draft_start_time,
                d.draft_end_date,
                d.draft_type,
                d.draft_timer,
                d.allow_auto_draft
            FROM league_master lm
                INNER JOIN league_season ls ON lm.league_id = ls.league_id
                LEFT JOIN league_season_draft_master d ON ls.league_id = d.league_id and ls.season_id = d.season_id
            WHERE lm.league_id = $1
            AND ls.season_id = (
                SELECT
                    season_id
                FROM league_season ls 
                WHERE ls.league_id = $1
                AND   ls.season_year = (
                    SELECT
                        max(season_year)
                    FROM league_season 
                    WHERE league_id = $1
                )
            );
        `;

        const param = [leagueId];

        const { rows : seasonInfo } = await query(leagueInfoQuery, param);
        
        if (!seasonInfo[0])
            return sendBadRequest(res, '시즌 정보가 없습니다.');

        return sendSuccess(res, {
            message: '현재 시즌 정보가 조회되었습니다.',
            seasonInfo : seasonInfo[0]
        });
    } catch (error) {
        return sendServerError(res, error, '리그 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const getCurrentMyTeamInfo = async (req, res) => {
    let { leagueId } = req.params;
    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    leagueId = decryptData(leagueId)

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);
    
    try {
        const teamListQuery = `
            SELECT
                lst.id,
                lst.user_id,
                lst.team_name,
                lst.logo_url,
                ft.path AS file_path,
                ft.mimetype AS file_mimetype
            FROM league_season_team lst
            LEFT JOIN file_table ft ON ft.file_id = lst.logo_url::uuid AND ft.sn = 1
            WHERE lst.league_id = $1
            AND lst.season_id = (
                SELECT
                    season_id
                FROM league_season ls 
                WHERE ls.league_id = $1
                AND   ls.season_year = (
                    SELECT
                        max(season_year)
                    FROM league_season 
                    WHERE league_id = $1
                )
            )
            AND user_id = $2;
        `;

        const { rows: teamList } = await query(teamListQuery, [leagueId, user.userId]);

        // logo_url이 상대경로나 절대경로인 경우, 파일에서 base64로 변환
        // mimetype 컬럼이 없으면 기본 이미지 타입(ex. image/png)로 지정하거나 mime-type 추론 필요
        for (let i = 0; i < teamList.length; i++) {
            const team = teamList[i];

            if (team.logo_url) {
                try {
                    // 예를 들어 logo_url이 'uploads/teams/logo1.png' 같은 상대경로라면
                    const filePath = path.isAbsolute(team.logo_url)
                        ? team.logo_url
                        : path.join(process.cwd(), team.logo_url);

                    // mimetype 컬럼이 없으면 기본값 지정 (예: 'image/png')
                    const mimeType = team.logo_url_mimetype || 'image/png';

                    const base64Image = await convertFileToBase64(filePath, mimeType);

                    team.logo_url = base64Image;
                } catch (err) {
                    // 파일 없거나 에러 나면 그냥 원래 url 유지하거나 null 처리 가능
                    console.error(`Failed to convert logo_url to base64 for team id ${team.id}`, err);
                    // team.logo_url = null; // 선택사항
                }
            }
        }

        return sendSuccess(res, {
            message: '현재 시즌 정보가 조회되었습니다.',
            myTeamInfo : teamList[0]
        });
    } catch (error) {
        return sendServerError(res, error, '리그 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const getLeagueList = async (req, res) => {
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
        return sendServerError(res, error, '리그 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const checkInviteCode = async (req, res) => {
    const { inviteCode } = req.body;

    if(!inviteCode){
        return sendBadRequest(res, "초대 코드가 없습니다.")
    }

    try {
        const inviteCodeQuery = `
            SELECT
                league_id
            FROM league_master
            WHERE invite_code = $1
        `

        const result = await query(inviteCodeQuery,[inviteCode])

        if(result.rows.length !== 1){
            return sendBadRequest(res, "초대 코드가 잘못되었습니다.");
        }

        return sendSuccess(res, {
            message : "정상적인 초대 코드입니다."
            , leagueId : result.rows[0].league_id
        })
    } catch (error) {
        return sendServerError(res, error, '초대 코드 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const joinLeague = async (req, res) => {
    const { leagueId } = req.body;

    if(!leagueId){
        return sendBadRequest(res, "참여하려는 리그가 없습니다.");
    }

    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        await withTransaction(async (client)=>{
            const validLeagueQuery = `
                SELECT
                    lm.status
                    , ls.season_id
                    , ls.max_teams
                    , ( SELECT 
                            count(*) 
                        FROM league_season_team 
                        WHERE league_id = lm.league_id
                            AND season_id = ls.season_id
                    ) as teams_count
                    , ( SELECT 
                            count(*) 
                        FROM league_season_team 
                        WHERE league_id = lm.league_id
                            AND season_id = ls.season_id
                            AND user_id = $2
                    ) as already_join
                FROM league_master lm
                    INNER JOIN league_season ls
                        ON lm.league_id = ls.league_id
                WHERE lm.league_id = $1
                ORDER BY season_year desc LIMIT 1
            `

            const validLeagueResult = await client.query(validLeagueQuery,[leagueId, user.userId]);

            if(validLeagueResult.rows[0].status !== "active") 
                return sendBadRequest(res, {
                    message : "현재 가입할 수 없는 리그입니다."
                    , code : -2
                });

            if(validLeagueResult.rows[0].teams_count >= validLeagueResult.rows[0].max_teams) 
                return sendBadRequest(res, {
                    message : "가입 인원을 초과하였습니다."
                    , code : -3
                });

            if(validLeagueResult.rows[0].already_join > 0)
                return sendBadRequest(res, {
                    message : "이미 가입된 리그입니다."
                    , code : -4
                });

            const leagueJoinQuery = `
                INSERT INTO league_season_team(
                    league_id
                    , season_id
                    , user_id
                    , team_name
                )
                VALUES(
                    $1, $2, $3, $4
                )
                RETURNING id
            `

            const { rows : leagueJoinResult} = await client.query(leagueJoinQuery,[
                leagueId
                , validLeagueResult.rows[0].season_id
                , user.userId
                , user.nickname
            ])

            const leagueTeamId = leagueJoinResult[0].id;

            const findDraftOrderQuery = `
                SELECT gs.draft_order
                FROM (
                    SELECT generate_series(1, (SELECT max_teams FROM league_season WHERE league_id = $1 AND season_id = $2)) AS draft_order
                ) gs
                LEFT JOIN league_season_draft_teams ldt
                    ON ldt.draft_order = gs.draft_order
                    AND ldt.league_id = $1
                    AND ldt.season_id = $2
                WHERE ldt.draft_order IS NULL
                ORDER BY gs.draft_order
                LIMIT 1;
            `;

            const { rows } = await query(findDraftOrderQuery, [leagueId, validLeagueResult.rows[0].season_id]);
            if (rows.length === 0) {
                throw new Error('빈 draft_order가 없습니다.');
            }

            const emptyDraftOrder = rows[0].draft_order;

            // 2) 비어있는 draft_order에 insert
            const insertDraftTeamQuery = `
                INSERT INTO league_season_draft_teams (league_id, season_id, draft_order, team_id)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;

            const { rows: insertedRows } = await query(insertDraftTeamQuery, [leagueId, validLeagueResult.rows[0].season_id, emptyDraftOrder, leagueTeamId]);

            return sendSuccess(res, {
                message : "성공적으로 리그 가입이 되었습니다!"
            })
        })
    } catch (error) {
        return sendServerError(res, error, '리그 가입 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}


export const getSeasonInfo = async (req, res) => {
    let { leagueId, seasonId } = req.params;

    leagueId = decryptData(leagueId);
    seasonId = decryptData(seasonId);

    try {
        const leagueInfoQuery = `
            SELECT
                ls.season_id,
                ls.season_year,
                ls.max_teams,
                ls.playoff_teams,
                ls.foreign_player_limit,
                TO_CHAR(ls.start_date, 'YYYY.MM.DD') AS start_date,
                ls.allow_trades,
                TO_CHAR(ls.trade_deadline, 'YYYY.MM.DD HH24:MI') AS trade_deadline,
                ls.waiver_clear_days,
                ls.allow_matchup_reset,
                ls.injured_list_slots,
                ls.tie_breaker,
                ls.lineup_change_restriction,
                ls.season_status,

                -- draft information
                draft_start_date,
                -- TO_CHAR(d.draft_start_time, 'HH24:MI') AS draft_start_time,
                d.draft_end_date,
                d.draft_type,
                d.draft_timer,
                d.allow_auto_draft,

                -- team information
                lst.id AS team_id,
                lst.team_name,
                ft.path AS logo_path,
                ft.mimetype AS logo_mimetype
            FROM league_master lm
                INNER JOIN league_season ls ON lm.league_id = ls.league_id
                LEFT JOIN league_season_draft_master d ON ls.league_id = d.league_id and ls.season_id = d.season_id
                LEFT JOIN league_season_team lst ON ls.season_id = lst.season_id
                LEFT JOIN file_table ft ON ft.file_id = lst.logo_url::uuid AND ft.sn = 1
            WHERE lm.league_id = $1
            AND ls.season_id = $2;
        `;


        const param = [leagueId, seasonId];

        const seasonInfo = await query(leagueInfoQuery, param);
        
        if (!seasonInfo.rows[0])
            return sendBadRequest(res, '시즌 정보가 없습니다.');

        const teamListQuery = `
            SELECT
                lst.id,
                lst.user_id,
                lst.team_name,
                lst.logo_url,
                ft.path AS file_path,
                ft.mimetype AS file_mimetype
            FROM league_season_team lst
            LEFT JOIN file_table ft ON ft.file_id = lst.logo_url::uuid AND ft.sn = 1
            WHERE lst.league_id = $1
            AND lst.season_id = $2;
        `;

        const { rows: teamList } = await query(teamListQuery, param);

        // logo_url이 상대경로나 절대경로인 경우, 파일에서 base64로 변환
        // mimetype 컬럼이 없으면 기본 이미지 타입(ex. image/png)로 지정하거나 mime-type 추론 필요
        for (let i = 0; i < teamList.length; i++) {
            const team = teamList[i];

            if (team.logo_url) {
                try {
                    // 예를 들어 logo_url이 'uploads/teams/logo1.png' 같은 상대경로라면
                    const filePath = path.isAbsolute(team.logo_url)
                        ? team.logo_url
                        : path.join(process.cwd(), team.logo_url);

                    // mimetype 컬럼이 없으면 기본값 지정 (예: 'image/png')
                    const mimeType = team.logo_url_mimetype || 'image/png';

                    const base64Image = await convertFileToBase64(filePath, mimeType);

                    team.logo_url = base64Image;
                } catch (err) {
                    // 파일 없거나 에러 나면 그냥 원래 url 유지하거나 null 처리 가능
                    console.error(`Failed to convert logo_url to base64 for team id ${team.id}`, err);
                    // team.logo_url = null; // 선택사항
                }
            }
        }

        const draftTeamQuery = `
            SELECT
                gs.draft_order,
                lst.id AS team_id,
                lst.user_id,
                lst.team_name,
                um.nickname,
                lst.logo_url,
                ft.path AS file_path,
                ft.mimetype AS file_mimetype
            FROM (
                SELECT generate_series(1, ls.max_teams) AS draft_order
                FROM league_season ls
                WHERE ls.league_id = $1 AND ls.season_id = $2
            ) gs
            LEFT JOIN league_season_draft_teams ldt
                ON ldt.draft_order = gs.draft_order AND ldt.league_id = $1 AND ldt.season_id = $2
            LEFT JOIN league_season_team lst
                ON lst.id = ldt.team_id
            LEFT JOIN user_master um ON lst.user_id = um.user_id
            LEFT JOIN file_table ft
                ON ft.file_id = lst.logo_url::uuid AND ft.sn = 1
            ORDER BY gs.draft_order;
        `;

        const { rows: draftTeams } = await query(draftTeamQuery, param);

        // base64 변환 처리
        for (const team of draftTeams) {
            if (team.logo_url) {
                try {
                    const filePath = path.isAbsolute(team.logo_url)
                        ? team.logo_url
                        : path.join(process.cwd(), team.logo_url);
                    const mimeType = team.file_mimetype || 'image/png';
                    const base64Image = await convertFileToBase64(filePath, mimeType);
                    team.logo_url = base64Image;
                } catch (err) {
                    console.error(`Failed to convert logo_url to base64 for team order ${team.draft_order}`, err);
                }
            }
        }

        const draftRoomQuery = `
            SELECT *
            FROM draft_rooms
            WHERE league_id = $1 AND season_id = $2
            LIMIT 1;
        `;
        const { rows: draftRoomRows } = await query(draftRoomQuery, param);
        const draftRoom = draftRoomRows[0] || null;

        let draftResults = {};

        if (draftRoom?.id) {
            const draftResultQuery = `
                SELECT
                    dr.team_id,
                    dr.round,
                    dr.pick_order,
                    dr.player_id,
                    pm.name AS player_name,
                    pm.primary_position
                FROM draft_results dr
                INNER JOIN kbo_player_master pm ON dr.player_id = pm.id
                WHERE dr.draft_room_id = $1
            `;
            const draftResultData = await query(draftResultQuery, [draftRoom.id]);

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
        }

        return sendSuccess(res, {
            message: '시즌 정보가 조회되었습니다.',
            seasonInfo: seasonInfo.rows[0],
            teamList,
            draftTeams,
            draftRoom,
            draftResults
        });
    } catch (error) {
        return sendServerError(res, error, '시즌 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

export const setDraftOrder = async(req,res) => {
    let { leagueId, seasonId } = req.params;

    const { 
        order
    } = req.body;

    leagueId = decryptData(decodeURIComponent(leagueId));
    seasonId = decryptData(decodeURIComponent(seasonId));

    const accessToken = req.headers['authorization']?.split(' ')[1];  // 'Bearer <token>' 형식에서 토큰 추출

    if(!accessToken){
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);

    try {
        await withTransaction(async (client)=>{
            const { rows : userTeamInfo } = await client.query(`
                SELECT
                    lst.id AS team_id,
                    lsdt.draft_order
                FROM league_season_team lst
                LEFT JOIN league_season_draft_teams lsdt
                    ON lst.id = lsdt.team_id
                    AND lst.league_id = lsdt.league_id
                    AND lst.season_id = lsdt.season_id
                WHERE
                    lst.league_id = $1
                    AND lst.season_id = $2
                    AND lst.user_id = $3
            `,[leagueId, seasonId, user.userId]);

            const team_id = userTeamInfo[0].team_id

            const { rows : orderInfo } = await client.query(`
                SELECT
                    *
                FROM league_season_draft_teams
                WHERE 
                    draft_order = $1
                AND league_id = $2
                AND season_id = $3
            `,[order, leagueId, seasonId]);
            
            if(orderInfo.length>0){
                return sendBadRequest(res, {
                    message : '변경할 수 없는 드래프트 순서입니다.',
                    code : -1
                });
            }

            await client.query(`
                UPDATE league_season_draft_teams
                SET 
                    draft_order = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE 
                    league_id = $2
                AND season_id = $3
                AND team_id = $4
            `,[order, leagueId, seasonId, team_id])
        })
        return sendSuccess(res, {
            message: '드래프트 순서 정보가 저장되었습니다.',
            leagueId,
            seasonId,
            order
        });
    } catch (error) {
        return sendServerError(res, error, '드래프트 순서 정보 저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

export const pickPlayer = async (req, res) => {
    try {
        let { leagueId, seasonId } = req.params;
        const { teamId, playerId } = req.body;

        if (!leagueId || !seasonId || !teamId || !playerId) {
            return sendBadRequest(res, '필수 파라미터가 부족합니다.');
        }

        // 복호화
        leagueId = decryptData(decodeURIComponent(leagueId));
        seasonId = decryptData(decodeURIComponent(seasonId));

        const roomKey = `${leagueId}_${seasonId}`;
        const draftRoom = activeDraftRooms.get(roomKey);

        if (!draftRoom) {
            return sendBadRequest(res, '진행 중인 드래프트 룸이 없습니다.');
        }

        // 현재 유저 차례인지 확인
        if (!draftRoom.isTeamTurn(teamId)) {
            return sendBadRequest(res, '현재 차례가 아닙니다.');
        }

        // 이미 픽된 선수인지 확인
        if (draftRoom.isPlayerPicked(playerId)) {
            return sendBadRequest(res, '이미 선택된 선수입니다.');
        }

        // 선수 정보 조회 후 pickPlayer 호출
        const { rows } = await query(`
            SELECT id AS player_id FROM kbo_player_master WHERE id = $1
        `, [playerId]);

        if (rows.length === 0) {
            return sendBadRequest(res, '해당 선수가 존재하지 않습니다.');
        }

        // 메모리 및 DB에 반영 + 다음 턴 진행까지 DraftRoom 내부에서 처리
        await draftRoom.pickPlayer({
            teamId,
            player: rows[0]
        });

        return sendSuccess(res, { message: '선수 선택이 완료되었습니다.' });
    } catch (error) {
        console.error(error);
        return sendServerError(res, error, '선수 선택 중 문제가 발생했습니다.');
    }
};

export const getMatchList = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.');

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);
    let { leagueId, seasonId } = req.params;

    leagueId = decryptData(leagueId);
    seasonId = decryptData(seasonId);

    const today = dayjs().format('YYYY-MM-DD')

    try {
        const matchQuery = `
            SELECT 
                m.id,
                m.week_id,
                m.week_number,
                m.home_team_id,
                m.away_team_id,
                m.home_score,
                m.away_score,
                m.match_status,
                m.match_start_date,
                m.match_end_date,
                ht.team_name as home_team_name,
                at.team_name as away_team_name,
                CASE 
                    WHEN ht.user_id = $4 OR at.user_id = $4 THEN true 
                    ELSE false 
                END AS is_me
            FROM league_season_match m
            LEFT JOIN league_season_team ht 
                ON ht.id = m.home_team_id
                AND ht.league_id = m.league_id
                AND ht.season_id = m.season_id
            LEFT JOIN league_season_team at 
                ON at.id = m.away_team_id
                AND at.league_id = m.league_id
                AND at.season_id = m.season_id
            WHERE m.league_id = $1
            AND m.season_id = $2
            AND $3 BETWEEN m.match_start_date AND m.match_end_date
            ORDER BY is_me DESC, m.match_start_date ASC;

        `;
        const matchInfo = await query(matchQuery, [leagueId, seasonId, today, user.userId]);

        if (matchInfo.rows.length > 0) {
            return sendSuccess(res, {
                message: '이번 주 경기 목록이 조회되었습니다.',
                matches: matchInfo.rows,
            });
        } else {
            return sendBadRequest(res, '이번 주에 예정된 경기가 없습니다.');
        }
    } catch (error) {
        return sendServerError(res, error, '경기 정보를 가져오는 중 오류가 발생했습니다.');
    }
};

export const getRosterTransactionHistory = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.');

    try {
        const user = jwt.verify(accessToken, process.env.JWT_SECRET);
        let { leagueId, seasonId } = req.params;

        leagueId = decryptData(leagueId);
        seasonId = decryptData(seasonId);

        const transactionQuery = `
            SELECT
                lrth.id AS transaction_id,
                lrth.player_id,
                lrth.team_id,
                lst.team_name,
                kpm.name AS player_name,
                lrth.transaction_date,
                lrth.transaction_type,
                lrth.details
            FROM
                league_season_roster_transaction_history lrth
            LEFT JOIN
                kbo_player_master kpm ON lrth.player_id = kpm.id
            LEFT JOIN
                league_season_team lst ON lrth.team_id = lst.id
            WHERE
                lrth.league_id = $1
            AND
                lrth.season_id = $2
            ORDER BY
                lrth.transaction_date DESC;
        `;
        const transactionHistory = await query(transactionQuery, [leagueId, seasonId]);

        if (transactionHistory.rows.length > 0) {
            return sendSuccess(res, {
                message: '로스터 변동 이력이 조회되었습니다.',
                transactions: transactionHistory.rows,
            });
        } else {
            return sendSuccess(res, {
                message: '로스터 변동 이력이 없습니다.',
                transactions: [],
            });
        }
    } catch (error) {
        console.error(error);
        return sendServerError(res, error, '로스터 변동 이력을 가져오는 중 오류가 발생했습니다.');
    }
};


export const getRankings = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.');

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);
    let { leagueId, seasonId } = req.params;

    leagueId = decryptData(leagueId);
    seasonId = decryptData(seasonId);

    try {
        const rankQuery = `
            SELECT 
                s.team_id,
                t.team_name,
                s.wins,
                s.losses,
                s.ties,
                s.points_for,
                s.points_against,
                s.rank
            FROM league_team_standings s
            JOIN league_season_team t 
                ON s.team_id = t.id
            WHERE s.league_id = $1 
            AND s.season_id = $2
            ORDER BY s.rank ASC NULLS LAST;
        `;
        const rankingInfo = await query(rankQuery, [leagueId, seasonId]);

        if (rankingInfo.rows.length > 0) {
            return sendSuccess(res, {
                message: '순위가 조회되었습니다.',
                rankings: rankingInfo.rows,
            });
        } else {
            return sendBadRequest(res, '순위 정보가 없습니다.');
        }
    } catch (error) {
        return sendServerError(res, error, '순위 정보를 가져오는 중 오류가 발생했습니다.');
    }
};

export const getTeamRosterLists = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) return sendBadRequest(res, '토큰이 제공되지 않았습니다.');

    const user = jwt.verify(accessToken, process.env.JWT_SECRET);
    let { leagueId, seasonId, teamId } = req.params;
    let { date } = req.query;

    leagueId = decryptData(leagueId);
    seasonId = decryptData(seasonId);
    teamId = decryptData(teamId);

    const today = dayjs().startOf('day');
    const targetDate = dayjs(date || undefined).startOf('day');

    try {
        // 서브쿼리로 시즌 연도 가져오기
        const seasonYearQuery = `SELECT season_year FROM league_season WHERE season_id = $1`;
        const { rows: seasonRows } = await query(seasonYearQuery, [seasonId]);
        if (!seasonRows[0]) return sendBadRequest(res, '시즌 정보를 찾을 수 없습니다.');
        const seasonYear = seasonRows[0].season_year;

        let rosterQuery = '';
        let queryParams = [leagueId, seasonId, teamId, targetDate.format('YYYY-MM-DD'), seasonYear];

        if (targetDate.isBefore(today)) {
            // 과거 → snapshot
            rosterQuery = `
                SELECT s.player_id,
                       p.name AS player_name,
                       s.roster_slot_position,
                       ps.position AS season_position,
                       ps.uniform_number,
                       ps.profile_image,
                       'n' AS move_yn
                FROM team_roster_snapshots s
                JOIN kbo_player_master p ON p.id = s.player_id
                JOIN kbo_player_season ps 
                    ON ps.player_id = p.id 
                   AND ps.year = $5
                WHERE s.league_id = $1
                  AND s.season_id = $2
                  AND s.team_id = $3
                  AND s.snapshot_date = $4
                ORDER BY s.roster_slot_position;
            `;
        } else if (targetDate.isAfter(today)) {
            // 미래 → plan (없으면 현재 roster)
            rosterQuery = `
                SELECT COALESCE(pl.player_id, r.player_id) AS player_id,
                       COALESCE(pl.roster_slot_position, r.roster_slot_position) AS roster_slot_position,
                       p.name AS player_name,
                       ps.position AS season_position,
                       ps.uniform_number,
                       ps.profile_image,
                       'y' AS move_yn
                FROM league_season_team_rosters r
                LEFT JOIN team_roster_plans pl
                  ON r.league_id = pl.league_id
                 AND r.season_id = pl.season_id
                 AND r.team_id = pl.team_id
                 AND r.player_id = pl.player_id
                 AND pl.lineup_date = $4
                JOIN kbo_player_master p 
                  ON p.id = COALESCE(pl.player_id, r.player_id)
                JOIN kbo_player_season ps 
                  ON ps.player_id = COALESCE(pl.player_id, r.player_id)
                 AND ps.year = $5
                WHERE r.league_id = $1
                  AND r.season_id = $2
                  AND r.team_id = $3
                  AND r.is_active = true
                ORDER BY roster_slot_position;
            `;
        } else {
            // 오늘
            rosterQuery = `
                SELECT r.player_id,
                       r.roster_slot_position,
                       p.name AS player_name,
                       ps.position AS season_position,
                       ps.uniform_number,
                       ps.profile_image,
                       CASE
                           WHEN g.game_time IS NOT NULL
                                AND (g.game_date + g.game_time::interval) <= NOW() THEN 'n'
                           ELSE 'y'
                       END AS move_yn
                FROM league_season_team_rosters r
                LEFT JOIN kbo_game_master g
                       ON g.season_year = $5
                      AND g.game_date = $4
                      AND (g.home_team_id = r.team_id OR g.away_team_id = r.team_id)
                JOIN kbo_player_master p 
                  ON p.id = r.player_id
                JOIN kbo_player_season ps 
                  ON ps.player_id = r.player_id
                 AND ps.year = $5
                WHERE r.league_id = $1
                  AND r.season_id = $2
                  AND r.team_id = $3
                  AND r.is_active = true
                ORDER BY r.roster_slot_position;
            `;
        }

        const { rows: rosterInfo } = await query(rosterQuery, queryParams);

        if (rosterInfo.length > 0) {
            return sendSuccess(res, { message: '로스터가 조회되었습니다.', rosterInfo });
        } else {
            return sendBadRequest(res, '로스터 정보가 없습니다.');
        }
    } catch (error) {
        return sendServerError(res, error, '로스터 정보를 가져오는 중 오류가 발생했습니다.');
    }
};