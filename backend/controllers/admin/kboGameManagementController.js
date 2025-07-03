import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'
import { encryptData, decryptData } from '../../utils/crypto.js';

import path from 'path';
import { saveUploadedFile, deleteFile } from '../../utils/fileUploader.js';
import { v4 as uuidv4 } from 'uuid';
import { rootCertificates } from 'tls';
import convertFileToBase64 from '../../utils/convertFileToBase64.js'; // apiResponse에서 임포트
import { stat } from 'fs';
import cluster from 'cluster';

const finalUploadsBaseDir = path.join(process.cwd(), 'uploads');

export const getKboGameList = async (req, res) => {
    try {
        let { gameDate, year, page, limit = 10 } = req.query;

        const queryParams = [];
        let whereClauses = [];

        // 날짜 필터
        if (gameDate) {
            queryParams.push(`${gameDate}`);
            whereClauses.push(`kgm.game_date = $${queryParams.length}`);
        }

        // 날짜 필터
        if (year) {
            queryParams.push(`${year}`);
            whereClauses.push(`kgm.season_year = $${queryParams.length}`);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 페이지네이션
        let paginationClause = '';
        let paginationParams = [];
        if (page) {
            page = Math.max(1, parseInt(page, 10));
            limit = Math.max(1, parseInt(limit, 10));
            const offset = (page - 1) * limit;
            paginationParams = [limit, offset];
            paginationClause = `LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`; // 파라미터 순서 명시적으로 지정
        }

        // 조회 쿼리
        const kboGameList = await query(`
            SELECT
                (ROW_NUMBER() OVER (ORDER BY kgm.season_year, kgm.game_date, kgm.game_time)) AS row_number,
                kgm.id as game_id,
                season_year , 
                away_team_id, 
                ati.name as away_team_name,
                home_team_id, 
                hti.name as home_team_name,
                stadium , 
                TO_CHAR(kgm.game_date, 'YYYY.MM.DD') as game_date , 
                TO_CHAR(kgm.game_time, 'HH24:MI') as game_time ,
                kgm.game_type,
                kgm.status,
                kgm.suspended_game_id,
                fta.sn as away_team_sn,
                fta.original_name as away_team_original_name,
                fta.size as away_team_size,
                fta.path as away_team_path,
                fta.mimetype as away_team_mimetype,
                fth.sn as home_team_sn,
                fth.original_name as home_team_original_name,
                fth.size as home_team_size,
                fth.path as home_team_path,
                fth.mimetype as home_team_mimetype
            FROM kbo_game_master kgm
                left join kbo_team_master ati on kgm.away_team_id = ati.id
                left join kbo_team_master hti on kgm.home_team_id = hti.id
                left join file_table fta on fta.file_id = ati.logo_url::uuid and fta.sn = 1
                left join file_table fth on fth.file_id = hti.logo_url::uuid and fth.sn = 1
            ${whereClause}
            ORDER BY kgm.season_year, kgm.game_date, kgm.game_time
            ${paginationClause}
        `, [...queryParams, ...paginationParams]);

        // 총 개수 조회
        let total = null;
        if (page) {
            const countResult = await query(`
                SELECT COUNT(DISTINCT kgm.id) AS total
                FROM kbo_game_master kgm
                ${whereClause}
            `, queryParams);
            total = parseInt(countResult.rows[0].total, 10);
        }

        const gameList = kboGameList.rows
        
        for(let idx=0;idx<gameList.length;idx++){
            let game = gameList[idx];

            let base64Image = null;
            if(game.away_team_path){
                const filePath = path.join(process.cwd(), game.away_team_path);
    
                base64Image = await convertFileToBase64(filePath, game.away_team_mimetype);
                kboGameList.rows[idx].away_team_path = base64Image;
            }
    
            let base64Image2 = null;
            if(game.home_team_path){
                const filePath = path.join(process.cwd(), game.home_team_path);
    
                base64Image2 = await convertFileToBase64(filePath, game.home_team_mimetype);
                kboGameList.rows[idx].home_team_path = base64Image2;
            }
        }
    
        

        return sendSuccess(res, {
            message: "게임 목록을 성공적으로 조회하였습니다.",
            gameList: kboGameList.rows,
            ...(page ? { total } : {})
        });
    } catch (error) {
        return sendServerError(res, error, '선수 목록 조회 중 문제가 발생하였습니다. 다시 시도해주세요.');
    }
};


export const createKboGame = async (req, res) => {
    const { 
        season_year , away_team_id, home_team_id, stadium , game_date , game_time, game_type
    } = req.body;

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
    
    // 필수값 검증
    if (!season_year || !away_team_id || !home_team_id || !stadium || !game_date || !game_time || !game_type) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            // 게임 마스터 테이블 저장
            const insertGameQuery = `
                INSERT INTO kbo_game_master (
                    season_year , away_team_id, home_team_id, stadium , game_date 
                    , game_time, game_type, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, 
                 $6, $7,'scheduled', CURRENT_TIMESTAMP)
                RETURNING id
            `;
            const { rows } = await client.query(insertGameQuery, [
                season_year , away_team_id, home_team_id, stadium , game_date , game_time, game_type
            ]);

            const gameId = rows[0].id;

            return sendSuccess(res, {
                message: "게임이 성공적으로 생성되었습니다.",
                gameId
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const createKboSuspendedGame = async (req, res) => {
    const { 
        season_year , away_team_id, home_team_id, stadium , game_date , game_time, game_type, suspended_game_id, game_id
    } = req.body;

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
    
    // 필수값 검증
    if (!season_year || !away_team_id || !home_team_id || !stadium || !game_date || !game_time || !game_type || !game_id) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            // 1. 게임 마스터 테이블 저장
            const insertGameQuery = `
                INSERT INTO kbo_game_master (
                    season_year , away_team_id, home_team_id, stadium , game_date, 
                    game_time, game_type, status, suspended_game_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'suspended', $8, CURRENT_TIMESTAMP)
                RETURNING id
            `;
            const { rows } = await client.query(insertGameQuery, [
                season_year, away_team_id, home_team_id, stadium, game_date, 
                game_time, game_type, suspended_game_id
            ]);
            const newGameId = rows[0].id;

            // 2. 기존 current_stats 복사
            const copyStatsQuery = `
                INSERT INTO kbo_game_current_stats (
                    game_id, "type", inning, inning_half, strike, ball, "out",
                    away_pitch_count, home_pitch_count, away_current_pitch_count, home_current_pitch_count,
                    away_batting_number, home_batting_number, away_score, home_score,
                    runner_1b, runner_2b, runner_3b,
                    batter_roster_id, pitcher_roster_id,
                    runner_1b_pitcher, runner_2b_pitcher, runner_3b_pitcher,
                    is_available_stat, away_current_batting_number, home_current_batting_number,
                    away_current_out, home_current_out,
                    created_at, updated_at
                )
                SELECT 
                    $1, "type", inning, inning_half, strike, ball, "out",
                    away_pitch_count, home_pitch_count, away_current_pitch_count, home_current_pitch_count,
                    away_batting_number, home_batting_number, away_score, home_score,
                    runner_1b, runner_2b, runner_3b,
                    batter_roster_id, pitcher_roster_id,
                    runner_1b_pitcher, runner_2b_pitcher, runner_3b_pitcher,
                    is_available_stat, away_current_batting_number, home_current_batting_number,
                    away_current_out, home_current_out,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                FROM kbo_game_current_stats
                WHERE game_id = $2
            `;
            await client.query(copyStatsQuery, [newGameId, game_id]);

            // 3. 기존 게임 roster 복사
            const copyRosterQuery = `
                INSERT INTO kbo_game_roster (
                    game_id, team_id, player_id, batting_order, "role",
                    replaced_by, replaced_inning, replaced_out,
                    created_at, updated_at,
                    "position", replaced_position
                )
                SELECT 
                    $1, team_id, player_id, batting_order, "role",
                    replaced_by, replaced_inning, replaced_out,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    "position", replaced_position
                FROM kbo_game_roster
                WHERE game_id = $2
            `;
            await client.query(copyRosterQuery, [newGameId, game_id]);

            return sendSuccess(res, {
                message: "서스펜디드 게임이 성공적으로 생성되었습니다.",
                gameId: newGameId
            });
        });
    } catch (error) {
        return sendServerError(res, error, "서스펜디드 게임 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const getKboGameDetail = async (req, res) => {
    let { gameId } = req.params;

    if (!gameId) {
        return sendBadRequest(res, "게임 정보가 잘못되었습니다.");
    }

    try {
        const gameInfoQuery = `
            SELECT 
                CASE 
                    WHEN kgr.team_id = kgm.away_team_id THEN 'away'
                    ELSE 'home'
                END AS team_type,
                kgr.id AS roster_id,
                kgr.game_id,
                kgr.team_id,
                ktm.name AS team_name,
                kgr.player_id,
                kp.name AS player_name,
                kgr.batting_order,
                kgr.role,
                kgr.replaced_by,
                COALESCE(krp.batting_hand,kp.batting_hand) as batting_hand,
                COALESCE(krp.throwing_hand,kp.throwing_hand) as throwing_hand,
                krp.name AS replaced_player_name,
                kgr.replaced_inning,
                kgr.replaced_inning_half,
                kgr.replaced_out,
                kgr.replaced_position,
                kgr.created_at,
                kgr.updated_at,
                kgr.position
            FROM kbo_game_roster kgr
            JOIN kbo_game_master kgm ON kgr.game_id = kgm.id
            LEFT JOIN kbo_team_master ktm ON kgr.team_id = ktm.id
            LEFT JOIN kbo_player_master kp ON kgr.player_id = kp.id
            LEFT JOIN kbo_player_master krp ON kgr.replaced_by = krp.id
            WHERE kgr.game_id = $1
            ORDER BY 
                kgr.batting_order, 
                CASE 
                    WHEN kgr.replaced_inning IS NULL THEN 0 
                    ELSE kgr.replaced_inning 
                END, 
                CASE 
                    WHEN kgr.replaced_inning_half IS NULL THEN 0 
                    WHEN kgr.replaced_inning_half = 'top' THEN 1 
                    WHEN kgr.replaced_inning_half = 'bottom' THEN 2 
                END,
                CASE 
                    WHEN kgr.replaced_out IS NULL THEN 0 
                    ELSE kgr.replaced_out 
                END, kgr.id;
        `;
        
        const { rows : gameInfo} = await query(gameInfoQuery, [gameId]);

        // 조회 쿼리
        const { rows : kboGameDetailInfo } = await query(`
            WITH latest_game_id AS (
                SELECT MAX(id) AS resolved_game_id
                FROM kbo_game_master
                WHERE (suspended_game_id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1)
                    OR id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1))
                AND id != $1
            ),
            last_suspended_game_id AS (
                SELECT MAX(id) AS last_suspended_game_id
                FROM kbo_game_master
                WHERE (
                    suspended_game_id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1)
                    OR id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1)
                    OR suspended_game_id = $1
                    OR id = $1
                )
            ),
            latest_stats AS (
                SELECT *
                FROM kbo_game_current_stats
                WHERE game_id = (SELECT resolved_game_id FROM latest_game_id)
                ORDER BY id DESC
                LIMIT 1
            ),
            suspended_pitchers AS (
                SELECT
                    CASE
                        WHEN kgr.team_id = kgm.home_team_id THEN 'home'
                        ELSE 'away'
                    END AS team_type,
                    kgr.player_id
                FROM kbo_game_roster kgr
                JOIN latest_game_id lgi ON kgr.game_id = lgi.resolved_game_id
                JOIN kbo_game_master kgm ON kgm.id = $1
                WHERE kgr.batting_order = 0
                AND kgr.id = (
                    SELECT MAX(id)
                    FROM kbo_game_roster sub
                    WHERE sub.game_id = kgr.game_id
                        AND sub.team_id = kgr.team_id
                        AND sub.batting_order = 0
                )
            )
            SELECT
                (ROW_NUMBER() OVER (ORDER BY kgm.season_year, kgm.game_date, kgm.game_time)) AS row_number,
                kgm.id AS game_id,
                kgm.season_year,
                kgm.away_team_id,
                ati.name AS away_team_name,
                kgm.home_team_id,
                hti.name AS home_team_name,
                kgm.stadium,
                TO_CHAR(kgm.game_date, 'YYYY.MM.DD') AS game_date,
                TO_CHAR(kgm.game_time, 'HH24:MI') AS game_time,
                kgm.game_type,
                kgm.status,
                kgm.suspended_game_id,

                -- Suspended Pitcher IDs
                COALESCE((SELECT player_id FROM suspended_pitchers WHERE team_type = 'home'),0) AS home_suspended_pitcher_id,
                COALESCE((SELECT player_id FROM suspended_pitchers WHERE team_type = 'away'),0) AS away_suspended_pitcher_id,

                -- Current Stats
                COALESCE(ls.home_pitch_count, 0) AS home_pitch_count,
                COALESCE(ls.home_current_out, 0) AS home_current_out,
                COALESCE(ls.away_current_batting_number, 0) AS away_current_batting_number,
                COALESCE(ls.away_pitch_count, 0) AS away_pitch_count,
                COALESCE(ls.away_current_out, 0) AS away_current_out,
                COALESCE(ls.home_current_batting_number, 0) AS home_current_batting_number,

                -- Logos
                fta.sn AS away_team_sn,
                fta.original_name AS away_team_original_name,
                fta.size AS away_team_size,
                fta.path AS away_team_path,
                fta.mimetype AS away_team_mimetype,
                fth.sn AS home_team_sn,
                fth.original_name AS home_team_original_name,
                fth.size AS home_team_size,
                fth.path AS home_team_path,
                fth.mimetype AS home_team_mimetype,

                -- Last Suspended Game ID (자기 자신 포함)
                (SELECT last_suspended_game_id FROM last_suspended_game_id) AS last_suspended_game_id

            FROM kbo_game_master kgm
            LEFT JOIN kbo_team_master ati ON kgm.away_team_id = ati.id
            LEFT JOIN kbo_team_master hti ON kgm.home_team_id = hti.id
            LEFT JOIN file_table fta ON fta.file_id = ati.logo_url::uuid AND fta.sn = 1
            LEFT JOIN file_table fth ON fth.file_id = hti.logo_url::uuid AND fth.sn = 1
            LEFT JOIN latest_stats ls ON TRUE
            WHERE kgm.id = $1;
        `, [gameId]);

        let game = kboGameDetailInfo[0];

        let base64Image = null;
        if(game.away_team_path){
            const filePath = path.join(process.cwd(), game.away_team_path);

            base64Image = await convertFileToBase64(filePath, game.away_team_mimetype);
            kboGameDetailInfo[0].away_team_path = base64Image;
        }

        let base64Image2 = null;
        if(game.home_team_path){
            const filePath = path.join(process.cwd(), game.home_team_path);

            base64Image2 = await convertFileToBase64(filePath, game.home_team_mimetype);
            kboGameDetailInfo[0].home_team_path = base64Image2;
        }
        
        const awayTeamInfo = new Array();
        const homeTeamInfo = new Array();

        gameInfo.forEach(game => {
            if(game.team_type === "away") awayTeamInfo.push(game)
            else homeTeamInfo.push(game)
        })

        return sendSuccess(res, {
            message: '게임 정보가 조회되었습니다.',
            awayTeamInfo,
            homeTeamInfo,
            gameInfo : kboGameDetailInfo[0]
        });

    } catch (error) {
        console.error('게임 정보 조회 오류:', error);
        return sendServerError(res, error, '게임 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

export const deleteKboGame = async (req, res) => {
    const accessToken = req.headers['authorization']?.split(' ')[1];

    if (!accessToken) {
        return sendBadRequest(res, '토큰이 제공되지 않았습니다.');
    }

    let { gameId } = req.body;
    if (!gameId) {
        return sendBadRequest(res, "삭제할 게임 ID가 제공되지 않았습니다.");
    }

    try {
        const user = jwt.verify(accessToken, process.env.JWT_SECRET);
        gameId = decryptData(gameId);

        await withTransaction(async (client) => {
            // **게임 존재 여부 확인**
            const { rows: gameRows } = await client.query(
                'SELECT * FROM kbo_game_master WHERE id = $1',
                [gameId]
            );

            if (gameRows.length === 0) {
                return sendBadRequest(res, "존재하지 않는 경기입니다.");
            }

            // **게임 마스터 정보 삭제**
            await client.query(
                'DELETE FROM kbo_game_master WHERE id = $1',
                [gameId]
            );

            return sendSuccess(res, "게임이 성공적으로 삭제되었습니다.");
        });
    } catch (error) {
        console.error('게임 삭제 중 오류 발생:', error);
        return sendServerError(res, error, "게임 삭제 중 오류가 발생했습니다.");
    }
};

export const updateKboGameStatus = async (req, res) => {
    const { gameId, status } = req.body;

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
    
    // 필수값 검증
    if (!gameId || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            // 게임 마스터 테이블 저장
            const updateStatusQuery = `
                UPDATE kbo_game_master SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1
            `;
            await client.query(updateStatusQuery, [ gameId, status ]);

            return sendSuccess(res, {
                message: "게임 상태가 성공적으로 변경되었습니다.",
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const createKboGameRoster = async (req, res) => {
    const { 
        game_id, team_id, player_id, batting_order, role, replaced_by, replaced_inning, replaced_out, position, replaced_position, isReplace, replaced_inning_half
    } = req.body;

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
    
    // 필수값 검증
    if(isReplace){
        if (!game_id || !team_id || batting_order === null || batting_order === undefined || !player_id || !position || 
            !replaced_by || !replaced_inning || replaced_out === undefined || !replaced_position || !replaced_inning_half) {
            return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
        }
    }else{
        if (!game_id || !team_id || batting_order === null || batting_order === undefined || !player_id || !position) {
            return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
        }
    }

    try {
        await withTransaction(async (client) => {
            // 게임 마스터 테이블 저장
            const insertGameQuery = `
                INSERT INTO kbo_game_roster (
                    game_id, team_id, player_id, batting_order, role,
                    replaced_by, replaced_inning, replaced_out, position, replaced_position,
                    replaced_inning_half, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, 
                    $6, $7, $8, $9, $10,
                    $11, CURRENT_TIMESTAMP
                )
                RETURNING id
            `;
            const { rows } = await client.query(insertGameQuery, [
                game_id, team_id, player_id, batting_order, role,
                replaced_by || null, (replaced_inning === undefined || replaced_inning === null)?null:replaced_inning, (replaced_out === undefined || replaced_out === null)?null:replaced_out, position, replaced_position || null,
                replaced_inning_half || null
            ]);

            const gameRosterId = rows[0].id;

            return sendSuccess(res, {
                message: "게임 로스터가 성공적으로 생성되었습니다.",
                gameRosterId
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 로스터 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const deleteKboGameRoster = async (req, res) => {
    const { 
        roster_id
    } = req.body;

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
    
    // 필수값 검증
    if (!roster_id) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            const deleteRosterQuery = `
                DELETE FROM kbo_game_roster WHERE id = $1
            `;
            const { rows } = await client.query(deleteRosterQuery, [ roster_id ]);

            return sendSuccess(res, {
                message: "게임 로스터가 성공적으로 삭제되었습니다."
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 로스터 삭제 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const createKboCurrentInfo = async(req,res) => {
    const { 
        game_id, type, inning, inning_half, strike, 
        ball, out, away_pitch_count, home_pitch_count, away_current_pitch_count, 
        home_current_pitch_count, away_batting_number, home_batting_number, away_score, home_score, 
        runner_1b, runner_2b, runner_3b, batter, pitcher, is_available_stat, away_current_batting_number, home_current_batting_number, away_current_out, home_current_out
    } = req.body;

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

    try {
        await withTransaction(async (client) => {
            const gameCurruntStatsQuery = `
                INSERT INTO kbo_game_current_stats
                (
                    game_id, type, inning, inning_half, strike, 
                    ball, out, away_pitch_count, home_pitch_count, away_current_pitch_count, 
                    home_current_pitch_count, away_batting_number, home_batting_number, away_score, home_score, 
                    runner_1b, runner_2b, runner_3b, batter_roster_id, pitcher_roster_id,
                    runner_1b_pitcher, runner_2b_pitcher, runner_3b_pitcher, is_available_stat, away_current_batting_number, 
                    home_current_batting_number, away_current_out, home_current_out, created_at
                )
                VALUES 
                (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, $25,
                    $26, $27, $28, CURRENT_TIMESTAMP
                )
            `;

            client.query(gameCurruntStatsQuery,[
                game_id, type, inning, inning_half, strike, 
                ball, out, away_pitch_count, home_pitch_count, away_current_pitch_count, 
                home_current_pitch_count, away_batting_number, home_batting_number, away_score, home_score, 
                runner_1b?.roster_id, runner_2b?.roster_id, runner_3b?.roster_id, batter?.roster_id, pitcher?.roster_id,
                runner_1b?.pitcher?.roster_id, runner_2b?.pitcher?.roster_id, runner_3b?.pitcher?.roster_id, (is_available_stat === null ? true : is_available_stat), away_current_batting_number, 
                home_current_batting_number, away_current_out, home_current_out,
            ])
        })
        
        return sendSuccess(res, {
            message: "게임 현 정보가 성공적으로 저장되었습니다."
        });
    } catch (error) {
        return sendServerError(res, error, "게임 정보 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const getKboGameInningStats = async (req, res) => {
    const { gameId } = req.params;

    if (!gameId) {
        return sendBadRequest(res, "게임 ID가 누락되었습니다.");
    }

    try {
        // 홈/어웨이 팀 ID 가져오기
        const teamQuery = `
            SELECT home_team_id, away_team_id
            FROM kbo_game_master
            WHERE id = $1
        `;
        const { rows: teamRows } = await query(teamQuery, [gameId]);
        if (teamRows.length === 0) {
            return sendBadRequest(res, "해당 게임이 존재하지 않습니다.");
        }
        const { home_team_id, away_team_id } = teamRows[0];

        // 이닝별 통계 가져오기 (홈/어웨이)
        const statsQuery = `
            SELECT
                team_id,
                inning,
                SUM(runs) AS runs,
                SUM(hits) AS hits,
                SUM(errors) AS errors,
                SUM(base_on_balls) AS base_on_balls,
                SUM(hit_by_pitch) AS hit_by_pitch
            FROM kbo_game_inning_stats
            WHERE game_id = $1
            GROUP BY team_id, inning
            ORDER BY team_id, inning ASC;
        `;
        const { rows: statRows } = await query(statsQuery, [gameId]);

        // 초기화
        const result = {
            home: [],
            away: [],
            maxInning: 9,
            summary: {
                home: { R: 0, H: 0, E: 0, B: 0 },
                away: { R: 0, H: 0, E: 0, B: 0 }
            }
        };

        statRows.forEach(row => {
            const isHome = row.team_id === home_team_id;
            const offenseTarget = isHome ? result.home : result.away;
            const offenseSummary = isHome ? result.summary.home : result.summary.away;
            const defenseSummary = isHome ? result.summary.away : result.summary.home;

            // 이닝별 데이터 삽입
            offenseTarget[row.inning - 1] = {
                inning: row.inning,
                runs: Number(row.runs) ?? 0,
                hits: Number(row.hits) ?? 0,
                errors: Number(row.errors) ?? 0, // 각 이닝 표시용 (수비 실책)
                base_on_balls: Number(row.base_on_balls) ?? 0,
            };

            // 요약 누적
            offenseSummary.R += Number(row.runs) ?? 0;
            offenseSummary.H += Number(row.hits) ?? 0;
            offenseSummary.B += (Number(row.base_on_balls) ?? 0) + (Number(row.hit_by_pitch) ?? 0);
            defenseSummary.E += Number(row.errors) ?? 0;

            if (row.inning > result.maxInning) {
                result.maxInning = row.inning;
            }
        });

        // 이닝 수에 맞춰 배열 길이 고정
        result.home.length = result.maxInning;
        result.away.length = result.maxInning;

        return sendSuccess(res, {
            message: '이닝별 스탯 조회 성공',
            inningInfo: result
        });

    } catch (error) {
        console.error("이닝별 스탯 조회 실패:", error);
        return sendServerError(res, error, '이닝별 경기 기록을 조회하는 중 오류가 발생했습니다.');
    }
};

export const getKboCurrentInfo = async (req, res) => {
    let { gameId } = req.params;

    if (!gameId) {
        return sendBadRequest(res, "게임 정보가 잘못되었습니다.");
    }

    try {
        const gameInfoQuery = `
            SELECT 
                kgcs.id,
                kgcs.game_id, 
                kgcs.type, 
                kgcs.inning, 
                kgcs.inning_half, 
                kgcs.strike, 
                kgcs.ball, 
                kgcs.out, 
                kgcs.away_pitch_count, 
                kgcs.home_pitch_count, 
                kgcs.away_current_pitch_count, 
                kgcs.home_current_pitch_count, 
                kgcs.away_batting_number, 
                kgcs.home_batting_number, 
                kgcs.away_score, 
                kgcs.home_score,
                kgcs.is_available_stat,
                kgcs.away_current_batting_number, 
                kgcs.home_current_batting_number,
                kgcs.away_current_out,
                kgcs.home_current_out,
                -- 🏃 Runner 1B
                jsonb_build_object(
                    'batting_order', kgr1b.batting_order,
                    'created_at', kgr1b.created_at,
                    'game_id', kgcs.game_id,
                    'player_id', kgr1b.player_id,
                    'player_name', pm1.name,
                    'position', kgr1b.position,
                    'replaced_by', kgr1b.replaced_by,
                    'replaced_player_name', pm2.name,
                    'replaced_inning', kgr1b.replaced_inning,
                    'replaced_out', kgr1b.replaced_out,
                    'replaced_position', kgr1b.replaced_position,
                    'role', kgr1b.role,
                    'roster_id', kgr1b.id,
                    'team_id', kgr1b.team_id,
                    'team_name', tm1.name,
                    'team_type', 
                        CASE 
                            WHEN kgm.home_team_id = kgr1b.team_id THEN 'home'
                            ELSE 'away'
                        END,
                    'updated_at', kgr1b.updated_at,
                    'pitcher', jsonb_build_object(
                        'batting_order', kgr1bp.batting_order,
                        'created_at', kgr1bp.created_at,
                        'game_id', kgcs.game_id,
                        'player_id', kgr1bp.player_id,
                        'player_name', pm1p.name,
                        'position', kgr1bp.position,
                        'replaced_by', kgr1bp.replaced_by,
                        'replaced_player_name', pm1pr.name,
                        'replaced_inning', kgr1bp.replaced_inning,
                        'replaced_out', kgr1bp.replaced_out,
                        'replaced_position', kgr1bp.replaced_position,
                        'role', kgr1bp.role,
                        'roster_id', kgr1bp.id,
                        'team_id', kgr1bp.team_id,
                        'team_name', tm1p.name,
                        'team_type', CASE WHEN kgm.home_team_id = kgr1bp.team_id THEN 'home' ELSE 'away' END,
                        'updated_at', kgr1bp.updated_at
                    )
                ) AS runner_1b,
                -- 🏃 Runner 2B
                jsonb_build_object(
                    'batting_order', kgr2b.batting_order,
                    'created_at', kgr2b.created_at,
                    'game_id', kgcs.game_id,
                    'player_id', kgr2b.player_id,
                    'player_name', pm3.name,
                    'position', kgr2b.position,
                    'replaced_by', kgr2b.replaced_by,
                    'replaced_player_name', pm4.name,
                    'replaced_inning', kgr2b.replaced_inning,
                    'replaced_out', kgr2b.replaced_out,
                    'replaced_position', kgr2b.replaced_position,
                    'role', kgr2b.role,
                    'roster_id', kgr2b.id,
                    'team_id', kgr2b.team_id,
                    'team_name', tm2.name,
                    'team_type',
                        CASE 
                            WHEN kgm.home_team_id = kgr2b.team_id THEN 'home'
                            ELSE 'away'
                        END,
                    'updated_at', kgr2b.updated_at,
                    'pitcher', jsonb_build_object(
                        'batting_order', kgr2bp.batting_order,
                        'created_at', kgr2bp.created_at,
                        'game_id', kgcs.game_id,
                        'player_id', kgr2bp.player_id,
                        'player_name', pm2p.name,
                        'position', kgr2bp.position,
                        'replaced_by', kgr2bp.replaced_by,
                        'replaced_player_name', pm2pr.name,
                        'replaced_inning', kgr2bp.replaced_inning,
                        'replaced_out', kgr2bp.replaced_out,
                        'replaced_position', kgr2bp.replaced_position,
                        'role', kgr2bp.role,
                        'roster_id', kgr2bp.id,
                        'team_id', kgr2bp.team_id,
                        'team_name', tm2p.name,
                        'team_type', CASE WHEN kgm.home_team_id = kgr2bp.team_id THEN 'home' ELSE 'away' END,
                        'updated_at', kgr2bp.updated_at
                    )
                ) AS runner_2b,
                -- 🏃 Runner 3B
                jsonb_build_object(
                    'batting_order', kgr3b.batting_order,
                    'created_at', kgr3b.created_at,
                    'game_id', kgcs.game_id,
                    'player_id', kgr3b.player_id,
                    'player_name', pm5.name,
                    'position', kgr3b.position,
                    'replaced_by', kgr3b.replaced_by,
                    'replaced_player_name', pm6.name,
                    'replaced_inning', kgr3b.replaced_inning,
                    'replaced_out', kgr3b.replaced_out,
                    'replaced_position', kgr3b.replaced_position,
                    'role', kgr3b.role,
                    'roster_id', kgr3b.id,
                    'team_id', kgr3b.team_id,
                    'team_name', tm3.name,
                    'team_type',
                        CASE 
                            WHEN kgm.home_team_id = kgr3b.team_id THEN 'home'
                            ELSE 'away'
                        END,
                    'updated_at', kgr3b.updated_at,
                    'pitcher', jsonb_build_object(
                        'batting_order', kgr3bp.batting_order,
                        'created_at', kgr3bp.created_at,
                        'game_id', kgcs.game_id,
                        'player_id', kgr3bp.player_id,
                        'player_name', pm3p.name,
                        'position', kgr3bp.position,
                        'replaced_by', kgr3bp.replaced_by,
                        'replaced_player_name', pm3pr.name,
                        'replaced_inning', kgr3bp.replaced_inning,
                        'replaced_out', kgr3bp.replaced_out,
                        'replaced_position', kgr3bp.replaced_position,
                        'role', kgr3bp.role,
                        'roster_id', kgr3bp.id,
                        'team_id', kgr3bp.team_id,
                        'team_name', tm3p.name,
                        'team_type', CASE WHEN kgm.home_team_id = kgr3bp.team_id THEN 'home' ELSE 'away' END,
                        'updated_at', kgr3bp.updated_at
                    )
                ) AS runner_3b,
                -- ⚾ Batter
                jsonb_build_object(
                    'batting_order', kgrbt.batting_order,
                    'created_at', kgrbt.created_at,
                    'game_id', kgcs.game_id,
                    'player_id', kgrbt.player_id,
                    'player_name', pm7.name,
                    'position', kgrbt.position,
                    'replaced_by', kgrbt.replaced_by,
                    'replaced_player_name', pm8.name,
                    'replaced_inning', kgrbt.replaced_inning,
                    'replaced_out', kgrbt.replaced_out,
                    'replaced_position', kgrbt.replaced_position,
                    'role', kgrbt.role,
                    'roster_id', kgrbt.id,
                    'team_id', kgrbt.team_id,
                    'team_name', tm4.name,
                    'batting_hand', COALESCE(pm8.batting_hand,pm7.batting_hand),
                    'throwing_hand', COALESCE(pm8.throwing_hand,pm7.throwing_hand),
                    'team_type', 
                        CASE 
                            WHEN kgm.home_team_id = kgrbt.team_id THEN 'home'
                            ELSE 'away'
                        END,
                    'updated_at', kgrbt.updated_at,
                    'stats', COALESCE(bs.stats, '{}')
                ) AS batter,
                -- ⚾ Pitcher
                jsonb_build_object(
                    'batting_order', kgrpc.batting_order,
                    'created_at', kgrpc.created_at,
                    'game_id', kgcs.game_id,
                    'player_id', kgrpc.player_id,
                    'player_name', pm9.name,
                    'position', kgrpc.position,
                    'replaced_by', kgrpc.replaced_by,
                    'replaced_player_name', pm10.name,
                    'replaced_inning', kgrpc.replaced_inning,
                    'replaced_out', kgrpc.replaced_out,
                    'replaced_position', kgrpc.replaced_position,
                    'role', kgrpc.role,
                    'batting_hand', COALESCE(pm10.batting_hand,pm9.batting_hand),
                    'throwing_hand', COALESCE(pm10.throwing_hand,pm9.throwing_hand),
                    'roster_id', kgrpc.id,
                    'team_id', kgrpc.team_id,
                    'team_name', tm5.name,
                    'team_type', 
                        CASE 
                            WHEN kgm.home_team_id = kgrpc.team_id THEN 'home'
                            ELSE 'away'
                        END,
                    'updated_at', kgrpc.updated_at
                ) AS pitcher
            FROM kbo_game_current_stats kgcs
                LEFT JOIN kbo_game_master kgm ON kgm.id = kgcs.game_id
                LEFT JOIN kbo_game_roster kgr1b ON kgr1b.id = kgcs.runner_1b
                LEFT JOIN kbo_game_roster kgr1bp ON kgr1bp.id = kgcs.runner_1b_pitcher
                LEFT JOIN kbo_player_master pm1p ON pm1p.id = kgr1bp.player_id
                LEFT JOIN kbo_player_master pm1pr ON pm1pr.id = kgr1bp.replaced_by
                LEFT JOIN kbo_team_master tm1p ON tm1p.id = kgr1bp.team_id
                LEFT JOIN kbo_player_master pm1 ON pm1.id = kgr1b.player_id
                LEFT JOIN kbo_player_master pm2 ON pm2.id = kgr1b.replaced_by
                LEFT JOIN kbo_team_master tm1 ON tm1.id = kgr1b.team_id
                LEFT JOIN kbo_game_roster kgr2b ON kgr2b.id = kgcs.runner_2b
                LEFT JOIN kbo_game_roster kgr2bp ON kgr2bp.id = kgcs.runner_2b_pitcher
                LEFT JOIN kbo_player_master pm2p ON pm2p.id = kgr2bp.player_id
                LEFT JOIN kbo_player_master pm2pr ON pm2pr.id = kgr2bp.replaced_by
                LEFT JOIN kbo_team_master tm2p ON tm2p.id = kgr2bp.team_id
                LEFT JOIN kbo_player_master pm3 ON pm3.id = kgr2b.player_id
                LEFT JOIN kbo_player_master pm4 ON pm4.id = kgr2b.replaced_by
                LEFT JOIN kbo_team_master tm2 ON tm2.id = kgr2b.team_id
                LEFT JOIN kbo_game_roster kgr3b ON kgr3b.id = kgcs.runner_3b
                LEFT JOIN kbo_game_roster kgr3bp ON kgr3bp.id = kgcs.runner_3b_pitcher
                LEFT JOIN kbo_player_master pm3p ON pm3p.id = kgr3bp.player_id
                LEFT JOIN kbo_player_master pm3pr ON pm3pr.id = kgr3bp.replaced_by
                LEFT JOIN kbo_team_master tm3p ON tm3p.id = kgr3bp.team_id
                LEFT JOIN kbo_player_master pm5 ON pm5.id = kgr3b.player_id
                LEFT JOIN kbo_player_master pm6 ON pm6.id = kgr3b.replaced_by
                LEFT JOIN kbo_team_master tm3 ON tm3.id = kgr3b.team_id
                LEFT JOIN kbo_game_roster kgrbt ON kgrbt.id = kgcs.batter_roster_id
                LEFT JOIN kbo_player_master pm7 ON pm7.id = kgrbt.player_id
                LEFT JOIN kbo_player_master pm8 ON pm8.id = kgrbt.replaced_by
                LEFT JOIN kbo_team_master tm4 ON tm4.id = kgrbt.team_id
                LEFT JOIN LATERAL (
                    SELECT jsonb_build_object(
                        'plate_appearances', COALESCE(SUM(COALESCE(bgs.plate_appearances, 0)), 0),
                        'at_bats', COALESCE(SUM(COALESCE(bgs.at_bats, 0)), 0),
                        'hits', COALESCE(SUM(COALESCE(bgs.hits, 0)), 0),
                        'singles', COALESCE(SUM(COALESCE(bgs.singles, 0)), 0),
                        'doubles', COALESCE(SUM(COALESCE(bgs.doubles, 0)), 0),
                        'triples', COALESCE(SUM(COALESCE(bgs.triples, 0)), 0),
                        'home_runs', COALESCE(SUM(COALESCE(bgs.home_runs, 0)), 0),
                        'rbis', COALESCE(SUM(COALESCE(bgs.runs_batted_in, 0)), 0),
                        'runs', COALESCE(SUM(COALESCE(bgs.runs, 0)), 0),
                        'walks', COALESCE(SUM(COALESCE(bgs.walks, 0)), 0),
                        'strikeouts', COALESCE(SUM(COALESCE(bgs.strikeouts, 0)), 0),
                        'stolen_bases', COALESCE(SUM(COALESCE(bgs.stolen_bases, 0)), 0),
                        'caught_stealings', COALESCE(SUM(COALESCE(bgs.caught_stealings, 0)), 0)
                    ) AS stats
                    FROM batter_game_stats bgs
                    WHERE bgs.game_id = kgcs.game_id
                    AND bgs.player_id = COALESCE(kgrbt.replaced_by,kgrbt.player_id)
                    AND bgs.batting_number <
                        CASE 
                            WHEN kgcs.inning_half = 'top' THEN kgcs.away_batting_number
                            ELSE kgcs.home_batting_number
                        END
                ) bs ON true
                LEFT JOIN kbo_game_roster kgrpc ON kgrpc.id = kgcs.pitcher_roster_id
                LEFT JOIN kbo_player_master pm9 ON pm9.id = kgrpc.player_id
                LEFT JOIN kbo_player_master pm10 ON pm10.id = kgrpc.replaced_by
                LEFT JOIN kbo_team_master tm5 ON tm5.id = kgrpc.team_id
            WHERE kgcs.game_id = $1
            ORDER BY kgcs.inning,  
                CASE WHEN kgcs.inning_half = 'top' THEN 0 ELSE 1 END, 
                kgcs.away_batting_number, 
                kgcs.home_batting_number,
                kgcs.id
        `;
        
        const { rows : gameInfo} = await query(gameInfoQuery, [gameId]);

        const gamedayInfo = organizeGameInfo(gameInfo)

        return sendSuccess(res, {
            message: '게임 현재 정보가 조회되었습니다.',
            gamedayInfo,
            gameInfo,
            lastGameInfo : gameInfo[gameInfo.length-1]
        });

    } catch (error) {
        console.error('게임 정보 조회 오류:', error);
        return sendServerError(res, error, '게임 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
};

const organizeGameInfo = (gameInfo) => {
    const organizedInfo = {};

    gameInfo.forEach((info) => {
        const { 
            inning, 
            inning_half, 
            away_batting_number, 
            home_batting_number, 
            id 
        } = info;

        // 🏷️ 이닝 생성
        if (!organizedInfo[inning] && info.type!=='lastInfo') {
            organizedInfo[inning] = {};
        }

        // 🏷️ 이닝 하프 생성
        if (!organizedInfo[inning]?.[inning_half] && info.type!=='lastInfo') {
            organizedInfo[inning][inning_half] = {};
        }

        // 🏷️ 타순 결정 (top일 때는 away, bottom일 때는 home)
        const battingNumber = inning_half === 'top' ? away_batting_number : home_batting_number;

        // 🏷️ 타순 배열이 없다면 생성
        if (!organizedInfo[inning]?.[inning_half]?.[battingNumber] && info.type!=='lastInfo') {
            organizedInfo[inning][inning_half][battingNumber] = [];
        }

        // 🏷️ 데이터 삽입
        if(info.type!=='lastInfo') organizedInfo[inning]?.[inning_half]?.[battingNumber].push(info);

        // 🏷️ ID 순서대로 정렬
        organizedInfo[inning]?.[inning_half]?.[battingNumber]?.sort((a, b) => a.id - b.id);
    });

    return organizedInfo;
};

export const createGameInningStats = async (req, res) => {
    const {
        game_id, inning, inning_half, team_id,
        runs = 0, hits = 0, errors = 0,
        base_on_balls = 0, strikeouts = 0, hit_by_pitch = 0
    } = req.body;

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

    // 필수 값 확인
    if (
        !game_id || !team_id ||
        inning === undefined || inning === null ||
        !inning_half
    ) {
        return sendBadRequest(res, '필수 입력값을 모두 입력해주세요.');
    }

    try {
        await withTransaction(async (client) => {
            const insertQuery = `
                INSERT INTO kbo_game_inning_stats (
                    game_id, inning, inning_half, team_id,
                    runs, hits, errors, base_on_balls, strikeouts, hit_by_pitch, updated_at
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP
                )
            `;

            await client.query(insertQuery, [
                game_id, inning, inning_half, team_id,
                runs, hits, errors, base_on_balls, strikeouts, hit_by_pitch
            ]);
        });

        return sendSuccess(res, {
            message: '이닝별 경기 기록이 성공적으로 저장되었습니다.'
        });
    } catch (error) {
        return sendServerError(res, error, '이닝별 기록 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
};

export const createBatterGameStats = async (req, res) => {
    const { 
        game_id, player_id, team_id, opponent_team_id, batting_order,
        inning, inning_half, out, stats, batting_number, seasonYn, dailyYn
    } = req.body;

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

    if(!game_id || !player_id || !team_id || !opponent_team_id || (batting_order===null || batting_order===undefined)
        || (inning===null || inning===undefined) || !inning_half || (out===null || out===undefined) || !stats || (batting_number===null || batting_number===undefined)){
        return sendBadRequest(res, '필수 입력값을 모두 입력해주세요.');
    }

    const queryParams = [];
    const whereClauses = [];

    for(let [stat, number] of Object.entries(stats)){
        queryParams.push(stat);
        whereClauses.push(number)
    }

    try {
        await withTransaction(async (client) => {
            const batterStatsQuery = `
                INSERT INTO batter_game_stats
                (
                    game_id, player_id, team_id, opponent_team_id, batting_order,
                    inning, inning_half, out, created_at, batting_number, ${queryParams.join(",")}
                )
                VALUES 
                (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, CURRENT_TIMESTAMP, $9, ${whereClauses.join(",")}
                )
            `;

            await client.query(batterStatsQuery,[
                game_id, player_id, team_id, opponent_team_id, batting_order,
                inning, inning_half, out, batting_number
            ])

            if (dailyYn) {
                const { rows } = await client.query(
                    `SELECT season_year, game_date FROM kbo_game_master WHERE id = $1`,
                    [game_id]
                );
                if (rows.length === 0) throw new Error('게임 정보를 찾을 수 없습니다.');
                const { season_year, game_date } = rows[0];

                const updates = queryParams
                    .map(col => `${col} = COALESCE(batter_daily_stats.${col}, 0) + EXCLUDED.${col}`)
                    .join(', ');

                const insertDailySql = `
                    INSERT INTO batter_daily_stats
                    (season_year, game_date, player_id, team_id, ${queryParams.join(",")})
                    VALUES ($1, $2, $3, $4, ${queryParams.map((_, i) => `$${5 + i}`).join(",")})
                    ON CONFLICT (season_year, player_id, team_id, game_date) DO UPDATE
                    SET ${updates}, updated_at = now()
                `;

                await client.query(insertDailySql, [season_year, game_date, player_id, team_id, ...whereClauses]);
            }

            if(seasonYn){
                const { rows } = await client.query(
                    `SELECT season_year FROM kbo_game_master WHERE id = $1`,
                    [game_id]
                );
                if (rows.length === 0) throw new Error('게임 정보를 찾을 수 없습니다.');
                const season_year = rows[0].season_year;

                const updates = queryParams
                    .map(col => `${col} = COALESCE(batter_season_stats.${col}, 0) + EXCLUDED.${col}`)
                    .join(', ');

                const insertSeasonSql = `
                    INSERT INTO batter_season_stats
                    (season_year, player_id, team_id, ${queryParams.join(",")})
                    VALUES ($1, $2, $3, ${queryParams.map((_, i) => `$${4 + i}`).join(",")})
                    ON CONFLICT (season_year, player_id, team_id) DO UPDATE
                    SET ${updates}, updated_at = now()
                `;
                
                // values 는 whereClauses 배열이어야 하고, queryParams 개수와 길이 맞춰져야 함
                await client.query(insertSeasonSql, [season_year, player_id, team_id, ...whereClauses]);
            }
            
        })
        
        return sendSuccess(res, {
            message: "타자 스탯 정보가 성공적으로 저장되었습니다."
        });
    } catch (error) {
        return sendServerError(res, error, "타자 스탯 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const createPitcherGameStats = async (req, res) => {
    const { 
        game_id, player_id, team_id, opponent_team_id, batting_order,
        inning, inning_half, out, stats, seasonYn, dailyYn
    } = req.body;

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

    if(!game_id || !player_id || !team_id || !opponent_team_id || (batting_order===null || batting_order===undefined)
        || (inning===null || inning===undefined) || !inning_half || (out===null || out===undefined) || !stats){
        return sendBadRequest(res, '필수 입력값을 모두 입력해주세요.');
    }

    const queryParams = [];
    const whereClauses = [];

    for(let [stat, number] of Object.entries(stats)){
        queryParams.push(stat);
        whereClauses.push(number)
    }

    try {
        await withTransaction(async (client) => {
            const batterStatsQuery = `
                INSERT INTO pitcher_game_stats
                (
                    game_id, player_id, team_id, opponent_team_id, batting_order,
                    inning, inning_half, out, created_at, ${queryParams.join(",")}
                )
                VALUES 
                (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, CURRENT_TIMESTAMP, ${whereClauses.join(",")}
                )
            `;

            await client.query(batterStatsQuery,[
                game_id, player_id, team_id, opponent_team_id, batting_order,
                inning, inning_half, out,
            ])

            if (dailyYn) {
                const { rows } = await client.query(
                    `SELECT season_year, game_date FROM kbo_game_master WHERE id = $1`,
                    [game_id]
                );
                if (rows.length === 0) throw new Error('게임 정보를 찾을 수 없습니다.');
                const { season_year, game_date } = rows[0];

                const updates = queryParams
                    .map(col => `${col} = COALESCE(pitcher_daily_stats.${col}, 0) + EXCLUDED.${col}`)
                    .join(', ');

                const insertDailySql = `
                    INSERT INTO pitcher_daily_stats
                    (season_year, game_date, player_id, team_id, ${queryParams.join(",")})
                    VALUES ($1, $2, $3, $4, ${queryParams.map((_, i) => `$${5 + i}`).join(",")})
                    ON CONFLICT (season_year, player_id, team_id, game_date) DO UPDATE
                    SET ${updates}, updated_at = now()
                `;

                await client.query(insertDailySql, [season_year, game_date, player_id, team_id, ...whereClauses]);
            }


            if(seasonYn){
                const { rows } = await client.query(
                    `SELECT season_year FROM kbo_game_master WHERE id = $1`,
                    [game_id]
                );
                if (rows.length === 0) throw new Error('게임 정보를 찾을 수 없습니다.');
                const season_year = rows[0].season_year;

                const updates = queryParams
                    .map(col => `${col} = COALESCE(pitcher_season_stats.${col}, 0) + EXCLUDED.${col}`)
                    .join(', ');

                const insertSeasonSql = `
                    INSERT INTO pitcher_season_stats
                    (season_year, player_id, team_id, ${queryParams.join(",")})
                    VALUES ($1, $2, $3, ${queryParams.map((_, i) => `$${4 + i}`).join(",")})
                    ON CONFLICT (season_year, player_id, team_id) DO UPDATE
                    SET ${updates}, updated_at = now()
                `;
                
                // values 는 whereClauses 배열이어야 하고, queryParams 개수와 길이 맞춰져야 함
                await client.query(insertSeasonSql, [season_year, player_id, team_id, ...whereClauses]);
            }
        })
        
        return sendSuccess(res, {
            message: "투수 스탯이 성공적으로 저장되었습니다."
        });
    } catch (error) {
        return sendServerError(res, error, "투수 스탯 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const getKboCurrentBatterStats = async (req,res) => {
    let { gameId, playerId } = req.params;
    
    if (!gameId || !playerId) {
        return sendBadRequest(res, "게임 정보가 잘못되었습니다.");
    }

    try {
        const currentBatterStatsQuery = `
            WITH related_games AS (
                SELECT id
                FROM kbo_game_master
                WHERE suspended_game_id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1)
                OR id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1)
                OR suspended_game_id = $1
                OR id = $1
            )
            SELECT
                bgs.player_id,
                COALESCE(SUM(COALESCE(bgs.plate_appearances, 0)), 0) AS plate_appearances,
                COALESCE(SUM(COALESCE(bgs.at_bats, 0)), 0) AS at_bats,
                COALESCE(SUM(COALESCE(bgs.hits, 0)), 0) AS hits,
                COALESCE(SUM(COALESCE(bgs.singles, 0)), 0) AS singles,
                COALESCE(SUM(COALESCE(bgs.doubles, 0)), 0) AS doubles,
                COALESCE(SUM(COALESCE(bgs.triples, 0)), 0) AS triples,
                COALESCE(SUM(COALESCE(bgs.home_runs, 0)), 0) AS home_runs,
                COALESCE(SUM(COALESCE(bgs.runs_batted_in, 0)), 0) AS rbis,
                COALESCE(SUM(COALESCE(bgs.runs, 0)), 0) AS runs,
                COALESCE(SUM(COALESCE(bgs.walks, 0)), 0) AS walks,
                COALESCE(SUM(COALESCE(bgs.strikeouts, 0)), 0) AS strikeouts,
                COALESCE(SUM(COALESCE(bgs.stolen_bases, 0)), 0) AS stolen_bases,
                COALESCE(SUM(COALESCE(bgs.caught_stealings, 0)), 0) AS caught_stealings
            FROM
                public.batter_game_stats bgs
            JOIN
                related_games rg ON bgs.game_id = rg.id
            WHERE
                bgs.player_id = $2
            GROUP BY
                bgs.player_id
        `

        let { rows : currentBatterStats } = await query(currentBatterStatsQuery,[gameId,playerId]);

        if (currentBatterStats.length === 0) {
            currentBatterStats = [{
                game_id: gameId,
                player_id: playerId,
                plate_appearances: 0,
                at_bats: 0,
                hits: 0,
                singles: 0,
                doubles: 0,
                triples: 0,
                home_runs: 0,
                rbis: 0,
                runs: 0,
                walks: 0,
                strikeouts: 0,
                stolen_bases: 0,
                caught_stealings: 0,
            }];
        }
        
        return sendSuccess(res, {
            message: "현 게임 타자 스탯 정보를 성공적으로 조회했습니다..",
            currentBatterStats
        });
    } catch (error) {
        return sendServerError(res, error, "현 게임 타자 스탯 정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const getKboCurrentPitcherStats = async (req, res) => {
    let { gameId, playerId } = req.params;

    if (!gameId || !playerId) {
        return sendBadRequest(res, "게임 정보가 잘못되었습니다.");
    }

    try {
        const currentPitcherStatsQuery = `
            WITH related_games AS (
                SELECT id
                FROM kbo_game_master
                WHERE suspended_game_id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1)
                OR id = (SELECT suspended_game_id FROM kbo_game_master WHERE id = $1)
                OR suspended_game_id = $1
                OR id = $1
            )
            SELECT
                pgs.player_id,
                COALESCE(SUM(COALESCE(pgs.outs_pitched, 0)), 0) AS outs_pitched,
                COALESCE(SUM(COALESCE(pgs.batters_faced, 0)), 0) AS batters_faced,
                COALESCE(SUM(COALESCE(pgs.pitches_thrown, 0)), 0) AS pitches_thrown,
                COALESCE(SUM(COALESCE(pgs.hits_allowed, 0)), 0) AS hits_allowed,
                COALESCE(SUM(COALESCE(pgs.home_runs_allowed, 0)), 0) AS home_runs_allowed,
                COALESCE(SUM(COALESCE(pgs.runs_allowed, 0)), 0) AS runs_allowed,
                COALESCE(SUM(COALESCE(pgs.earned_runs, 0)), 0) AS earned_runs,
                COALESCE(SUM(COALESCE(pgs.walks_allowed, 0)), 0) AS walks_allowed,
                COALESCE(SUM(COALESCE(pgs.hit_batters, 0)), 0) AS hit_batters,
                COALESCE(SUM(COALESCE(pgs.strikeouts, 0)), 0) AS strikeouts,
                COALESCE(SUM(COALESCE(pgs.wild_pitches, 0)), 0) AS wild_pitches,
                COALESCE(SUM(COALESCE(pgs.balks, 0)), 0) AS balks,
                COALESCE(SUM(COALESCE(pgs.wins, 0)), 0) AS wins,
                COALESCE(SUM(COALESCE(pgs.losses, 0)), 0) AS losses,
                COALESCE(SUM(COALESCE(pgs.saves, 0)), 0) AS saves,
                COALESCE(SUM(COALESCE(pgs.holds, 0)), 0) AS holds,
                COALESCE(SUM(COALESCE(pgs.blown_saves, 0)), 0) AS blown_saves,
                COALESCE(SUM(COALESCE(pgs.quality_start, 0)), 0) AS quality_start,
                COALESCE(SUM(COALESCE(pgs.complete_game, 0)), 0) AS complete_game,
                COALESCE(SUM(COALESCE(pgs.shutout, 0)), 0) AS shutout,
                COALESCE(SUM(COALESCE(pgs.perfect_game, 0)), 0) AS perfect_game,
                COALESCE(SUM(COALESCE(pgs.no_hit, 0)), 0) AS no_hit
            FROM
                public.pitcher_game_stats pgs
            JOIN
                related_games rg ON pgs.game_id = rg.id
            WHERE
                pgs.player_id = $2
            GROUP BY
                pgs.player_id
        `;

        let { rows: currentPitcherStats } = await query(currentPitcherStatsQuery, [gameId, playerId]);

        if (currentPitcherStats.length === 0) {
            currentPitcherStats = [{
                game_id: gameId,
                player_id: playerId,
                outs_pitched: 0,
                batters_faced: 0,
                pitches_thrown: 0,
                hits_allowed: 0,
                home_runs_allowed: 0,
                runs_allowed: 0,
                earned_runs: 0,
                walks_allowed: 0,
                hit_batters: 0,
                strikeouts: 0,
                wild_pitches: 0,
                balks: 0,
                wins: 0,
                losses: 0,
                saves: 0,
                holds: 0,
                blown_saves: 0,
                quality_start: 0,
                complete_game: 0,
                shutout: 0,
                perfect_game: 0,
                no_hit: 0
            }];
        }

        return sendSuccess(res, {
            message: "현 게임 투수 스탯 정보를 성공적으로 조회했습니다.",
            currentPitcherStats
        });
    } catch (error) {
        return sendServerError(res, error, "현 게임 투수 스탯 정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};


export const updateKboGameSeasonStats = async (req, res) => {
    const { gameId } = req.body;
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

    if (!gameId) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            const { rows: relatedRows } = await client.query(
                `
                WITH base AS (
                    SELECT id, COALESCE(suspended_game_id, id) AS group_id
                    FROM kbo_game_master
                )
                SELECT id FROM base
                WHERE group_id = (
                    SELECT COALESCE(suspended_game_id, id)
                    FROM kbo_game_master
                    WHERE id = $1
                )
                `,
                [gameId]
            );

            const relatedGameIds = relatedRows.map((r) => r.id);

            const { rows: seasonRow } = await client.query(
                `SELECT season_year FROM kbo_game_master WHERE id = $1`,
                [gameId]
            );
            if (seasonRow.length === 0) throw new Error("해당 게임을 찾을 수 없습니다.");
            const seasonYear = Number(seasonRow[0].season_year);

            await client.query(
                `
                INSERT INTO batter_season_stats (
                    season_year, player_id, team_id,
                    plate_appearances, at_bats, hits, singles, doubles, triples,
                    home_runs, runs_batted_in, runs, walks, intentional_walks,
                    strikeouts, hit_by_pitch, sacrifice_bunts, sacrifice_flies,
                    stolen_bases, caught_stealings, grounded_into_double_play,
                    errors, left_on_base, flyouts, groundouts, linedrives,
                    triple_play, pickoffs,
                    intentional_base_on_balls, fielders_choice, grand_slams,
                    solo_home_runs, two_run_home_runs, three_run_home_runs,
                    games_played
                )
                SELECT
                    $2, player_id, team_id,
                    COALESCE(SUM(plate_appearances), 0),
                    COALESCE(SUM(at_bats), 0),
                    COALESCE(SUM(hits), 0),
                    COALESCE(SUM(singles), 0),
                    COALESCE(SUM(doubles), 0),
                    COALESCE(SUM(triples), 0),
                    COALESCE(SUM(home_runs), 0),
                    COALESCE(SUM(runs_batted_in), 0),
                    COALESCE(SUM(runs), 0),
                    COALESCE(SUM(walks), 0),
                    COALESCE(SUM(intentional_walks), 0),
                    COALESCE(SUM(strikeouts), 0),
                    COALESCE(SUM(hit_by_pitch), 0),
                    COALESCE(SUM(sacrifice_bunts), 0),
                    COALESCE(SUM(sacrifice_flies), 0),
                    COALESCE(SUM(stolen_bases), 0),
                    COALESCE(SUM(caught_stealings), 0),
                    COALESCE(SUM(grounded_into_double_play), 0),
                    COALESCE(SUM(errors), 0),
                    COALESCE(SUM(left_on_base), 0),
                    COALESCE(SUM(flyouts), 0),
                    COALESCE(SUM(groundouts), 0),
                    COALESCE(SUM(linedrives), 0),
                    COALESCE(SUM(triple_play), 0),
                    COALESCE(SUM(pickoffs), 0),
                    COALESCE(SUM(intentional_base_on_balls), 0),
                    COALESCE(SUM(fielders_choice), 0),
                    COALESCE(SUM(grand_slams), 0),
                    COALESCE(SUM(solo_home_runs), 0),
                    COALESCE(SUM(two_run_home_runs), 0),
                    COALESCE(SUM(three_run_home_runs), 0),
                    1
                FROM batter_game_stats
                WHERE game_id = ANY($1)
                GROUP BY player_id, team_id
                ON CONFLICT (season_year, player_id, team_id) DO UPDATE
                SET
                    plate_appearances = batter_season_stats.plate_appearances + EXCLUDED.plate_appearances,
                    at_bats = batter_season_stats.at_bats + EXCLUDED.at_bats,
                    hits = batter_season_stats.hits + EXCLUDED.hits,
                    singles = batter_season_stats.singles + EXCLUDED.singles,
                    doubles = batter_season_stats.doubles + EXCLUDED.doubles,
                    triples = batter_season_stats.triples + EXCLUDED.triples,
                    home_runs = batter_season_stats.home_runs + EXCLUDED.home_runs,
                    runs_batted_in = batter_season_stats.runs_batted_in + EXCLUDED.runs_batted_in,
                    runs = batter_season_stats.runs + EXCLUDED.runs,
                    walks = batter_season_stats.walks + EXCLUDED.walks,
                    intentional_walks = batter_season_stats.intentional_walks + EXCLUDED.intentional_walks,
                    strikeouts = batter_season_stats.strikeouts + EXCLUDED.strikeouts,
                    hit_by_pitch = batter_season_stats.hit_by_pitch + EXCLUDED.hit_by_pitch,
                    sacrifice_bunts = batter_season_stats.sacrifice_bunts + EXCLUDED.sacrifice_bunts,
                    sacrifice_flies = batter_season_stats.sacrifice_flies + EXCLUDED.sacrifice_flies,
                    stolen_bases = batter_season_stats.stolen_bases + EXCLUDED.stolen_bases,
                    caught_stealings = batter_season_stats.caught_stealings + EXCLUDED.caught_stealings,
                    grounded_into_double_play = batter_season_stats.grounded_into_double_play + EXCLUDED.grounded_into_double_play,
                    errors = batter_season_stats.errors + EXCLUDED.errors,
                    left_on_base = batter_season_stats.left_on_base + EXCLUDED.left_on_base,
                    flyouts = batter_season_stats.flyouts + EXCLUDED.flyouts,
                    groundouts = batter_season_stats.groundouts + EXCLUDED.groundouts,
                    linedrives = batter_season_stats.linedrives + EXCLUDED.linedrives,
                    triple_play = batter_season_stats.triple_play + EXCLUDED.triple_play,
                    pickoffs = batter_season_stats.pickoffs + EXCLUDED.pickoffs,
                    intentional_base_on_balls = batter_season_stats.intentional_base_on_balls + EXCLUDED.intentional_base_on_balls,
                    fielders_choice = batter_season_stats.fielders_choice + EXCLUDED.fielders_choice,
                    grand_slams = batter_season_stats.grand_slams + EXCLUDED.grand_slams,
                    solo_home_runs = batter_season_stats.solo_home_runs + EXCLUDED.solo_home_runs,
                    two_run_home_runs = batter_season_stats.two_run_home_runs + EXCLUDED.two_run_home_runs,
                    three_run_home_runs = batter_season_stats.three_run_home_runs + EXCLUDED.three_run_home_runs,
                    games_played = 1 + EXCLUDED.games_played;
                `,
                [relatedGameIds, seasonYear]
            );

            await client.query(
                `
                INSERT INTO pitcher_season_stats (
                    season_year, player_id, team_id,
                    games_played, games_started, outs_pitched, batters_faced,
                    pitches_thrown, hits_allowed, singles_allowed, doubles_allowed,
                    triples_allowed, home_runs_allowed, runs_allowed, earned_runs,
                    walks_allowed, intentional_walks_allowed, hit_batters, hit_by_pitch_allowed,
                    intentional_base_on_balls, strikeouts, wild_pitches, balks, wins,
                    losses, saves, holds, blown_saves, flyouts, groundouts, linedrives,
                    grounded_into_double_play, triple_play, pickoffs,
                    quality_start, complete_game, shutout, perfect_game, no_hit
                )
                SELECT
                    $2, player_id, team_id,
                    1,
                    COALESCE(SUM(games_started), 0),
                    COALESCE(SUM(outs_pitched), 0),
                    COALESCE(SUM(batters_faced), 0),
                    COALESCE(SUM(pitches_thrown), 0),
                    COALESCE(SUM(hits_allowed), 0),
                    COALESCE(SUM(singles_allowed), 0),
                    COALESCE(SUM(doubles_allowed), 0),
                    COALESCE(SUM(triples_allowed), 0),
                    COALESCE(SUM(home_runs_allowed), 0),
                    COALESCE(SUM(runs_allowed), 0),
                    COALESCE(SUM(earned_runs), 0),
                    COALESCE(SUM(walks_allowed), 0),
                    COALESCE(SUM(intentional_walks_allowed), 0),
                    COALESCE(SUM(hit_batters), 0),
                    COALESCE(SUM(hit_by_pitch_allowed), 0),
                    COALESCE(SUM(intentional_base_on_balls), 0),
                    COALESCE(SUM(strikeouts), 0),
                    COALESCE(SUM(wild_pitches), 0),
                    COALESCE(SUM(balks), 0),
                    COALESCE(SUM(wins), 0),
                    COALESCE(SUM(losses), 0),
                    COALESCE(SUM(saves), 0),
                    COALESCE(SUM(holds), 0),
                    COALESCE(SUM(blown_saves), 0),
                    COALESCE(SUM(flyouts), 0),
                    COALESCE(SUM(groundouts), 0),
                    COALESCE(SUM(linedrives), 0),
                    COALESCE(SUM(grounded_into_double_play), 0),
                    COALESCE(SUM(triple_play), 0),
                    COALESCE(SUM(pickoffs), 0),
                    COALESCE(SUM(quality_start), 0),
                    COALESCE(SUM(complete_game), 0),
                    COALESCE(SUM(shutout), 0),
                    COALESCE(SUM(perfect_game), 0),
                    COALESCE(SUM(no_hit), 0)
                FROM pitcher_game_stats
                WHERE game_id = ANY($1)
                GROUP BY player_id, team_id
                ON CONFLICT (season_year, player_id, team_id) DO UPDATE
                SET
                    games_played = 1 + pitcher_season_stats.games_played,
                    games_started = pitcher_season_stats.games_started + EXCLUDED.games_started,
                    outs_pitched = pitcher_season_stats.outs_pitched + EXCLUDED.outs_pitched,
                    batters_faced = pitcher_season_stats.batters_faced + EXCLUDED.batters_faced,
                    pitches_thrown = pitcher_season_stats.pitches_thrown + EXCLUDED.pitches_thrown,
                    hits_allowed = pitcher_season_stats.hits_allowed + EXCLUDED.hits_allowed,
                    singles_allowed = pitcher_season_stats.singles_allowed + EXCLUDED.singles_allowed,
                    doubles_allowed = pitcher_season_stats.doubles_allowed + EXCLUDED.doubles_allowed,
                    triples_allowed = pitcher_season_stats.triples_allowed + EXCLUDED.triples_allowed,
                    home_runs_allowed = pitcher_season_stats.home_runs_allowed + EXCLUDED.home_runs_allowed,
                    runs_allowed = pitcher_season_stats.runs_allowed + EXCLUDED.runs_allowed,
                    earned_runs = pitcher_season_stats.earned_runs + EXCLUDED.earned_runs,
                    walks_allowed = pitcher_season_stats.walks_allowed + EXCLUDED.walks_allowed,
                    intentional_walks_allowed = pitcher_season_stats.intentional_walks_allowed + EXCLUDED.intentional_walks_allowed,
                    hit_batters = pitcher_season_stats.hit_batters + EXCLUDED.hit_batters,
                    hit_by_pitch_allowed = pitcher_season_stats.hit_by_pitch_allowed + EXCLUDED.hit_by_pitch_allowed,
                    intentional_base_on_balls = pitcher_season_stats.intentional_base_on_balls + EXCLUDED.intentional_base_on_balls,
                    strikeouts = pitcher_season_stats.strikeouts + EXCLUDED.strikeouts,
                    wild_pitches = pitcher_season_stats.wild_pitches + EXCLUDED.wild_pitches,
                    balks = pitcher_season_stats.balks + EXCLUDED.balks,
                    wins = pitcher_season_stats.wins + EXCLUDED.wins,
                    losses = pitcher_season_stats.losses + EXCLUDED.losses,
                    saves = pitcher_season_stats.saves + EXCLUDED.saves,
                    holds = pitcher_season_stats.holds + EXCLUDED.holds,
                    blown_saves = pitcher_season_stats.blown_saves + EXCLUDED.blown_saves,
                    flyouts = pitcher_season_stats.flyouts + EXCLUDED.flyouts,
                    groundouts = pitcher_season_stats.groundouts + EXCLUDED.groundouts,
                    linedrives = pitcher_season_stats.linedrives + EXCLUDED.linedrives,
                    grounded_into_double_play = pitcher_season_stats.grounded_into_double_play + EXCLUDED.grounded_into_double_play,
                    triple_play = pitcher_season_stats.triple_play + EXCLUDED.triple_play,
                    pickoffs = pitcher_season_stats.pickoffs + EXCLUDED.pickoffs,
                    quality_start = pitcher_season_stats.quality_start + EXCLUDED.quality_start,
                    complete_game = pitcher_season_stats.complete_game + EXCLUDED.complete_game,
                    shutout = pitcher_season_stats.shutout + EXCLUDED.shutout,
                    perfect_game = pitcher_season_stats.perfect_game + EXCLUDED.perfect_game,
                    no_hit = pitcher_season_stats.no_hit + EXCLUDED.no_hit;
                `,
                [relatedGameIds, seasonYear]
            );


            return sendSuccess(res, {
                message: `${relatedGameIds.length}개의 게임 통계를 시즌 누적으로 반영했습니다.`,
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const updateKboGameDailyStats = async (req, res) => {
    const { gameId } = req.body;
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

    if (!gameId) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            const { rows: gameRows } = await client.query(
                `SELECT season_year, game_date FROM kbo_game_master WHERE id = $1`,
                [gameId]
            );

            if (gameRows.length === 0) {
                throw new Error("해당 게임을 찾을 수 없습니다.");
            }

            const { season_year, game_date } = gameRows[0];

            await client.query(`
                INSERT INTO batter_daily_stats (
                    season_year, game_date, player_id, team_id,
                    plate_appearances, at_bats, hits, singles, doubles, triples,
                    home_runs, runs_batted_in, runs, walks, intentional_walks,
                    strikeouts, hit_by_pitch, sacrifice_bunts, sacrifice_flies,
                    stolen_bases, caught_stealings, grounded_into_double_play,
                    errors, left_on_base, flyouts, groundouts, linedrives,
                    triple_play, pickoffs,
                    intentional_base_on_balls, fielders_choice, grand_slams,
                    solo_home_runs, two_run_home_runs, three_run_home_runs,
                    games_played
                )
                SELECT
                    $2, $3,
                    player_id, team_id,
                    COALESCE(SUM(plate_appearances), 0), COALESCE(SUM(at_bats), 0), COALESCE(SUM(hits), 0),
                    COALESCE(SUM(singles), 0), COALESCE(SUM(doubles), 0), COALESCE(SUM(triples), 0),
                    COALESCE(SUM(home_runs), 0), COALESCE(SUM(runs_batted_in), 0), COALESCE(SUM(runs), 0),
                    COALESCE(SUM(walks), 0), COALESCE(SUM(intentional_walks), 0), COALESCE(SUM(strikeouts), 0),
                    COALESCE(SUM(hit_by_pitch), 0), COALESCE(SUM(sacrifice_bunts), 0), COALESCE(SUM(sacrifice_flies), 0),
                    COALESCE(SUM(stolen_bases), 0), COALESCE(SUM(caught_stealings), 0), COALESCE(SUM(grounded_into_double_play), 0),
                    COALESCE(SUM(errors), 0), COALESCE(SUM(left_on_base), 0), COALESCE(SUM(flyouts), 0),
                    COALESCE(SUM(groundouts), 0), COALESCE(SUM(linedrives), 0), COALESCE(SUM(triple_play), 0),
                    COALESCE(SUM(pickoffs), 0), COALESCE(SUM(intentional_base_on_balls), 0),
                    COALESCE(SUM(fielders_choice), 0), COALESCE(SUM(grand_slams), 0), COALESCE(SUM(solo_home_runs), 0),
                    COALESCE(SUM(two_run_home_runs), 0), COALESCE(SUM(three_run_home_runs), 0),
                    1
                FROM batter_game_stats
                WHERE game_id = $1
                GROUP BY player_id, team_id
                ON CONFLICT (season_year, player_id, team_id, game_date) DO UPDATE SET
                    plate_appearances = batter_daily_stats.plate_appearances + EXCLUDED.plate_appearances,
                    at_bats = batter_daily_stats.at_bats + EXCLUDED.at_bats,
                    hits = batter_daily_stats.hits + EXCLUDED.hits,
                    singles = batter_daily_stats.singles + EXCLUDED.singles,
                    doubles = batter_daily_stats.doubles + EXCLUDED.doubles,
                    triples = batter_daily_stats.triples + EXCLUDED.triples,
                    home_runs = batter_daily_stats.home_runs + EXCLUDED.home_runs,
                    runs_batted_in = batter_daily_stats.runs_batted_in + EXCLUDED.runs_batted_in,
                    runs = batter_daily_stats.runs + EXCLUDED.runs,
                    walks = batter_daily_stats.walks + EXCLUDED.walks,
                    intentional_walks = batter_daily_stats.intentional_walks + EXCLUDED.intentional_walks,
                    strikeouts = batter_daily_stats.strikeouts + EXCLUDED.strikeouts,
                    hit_by_pitch = batter_daily_stats.hit_by_pitch + EXCLUDED.hit_by_pitch,
                    sacrifice_bunts = batter_daily_stats.sacrifice_bunts + EXCLUDED.sacrifice_bunts,
                    sacrifice_flies = batter_daily_stats.sacrifice_flies + EXCLUDED.sacrifice_flies,
                    stolen_bases = batter_daily_stats.stolen_bases + EXCLUDED.stolen_bases,
                    caught_stealings = batter_daily_stats.caught_stealings + EXCLUDED.caught_stealings,
                    grounded_into_double_play = batter_daily_stats.grounded_into_double_play + EXCLUDED.grounded_into_double_play,
                    errors = batter_daily_stats.errors + EXCLUDED.errors,
                    left_on_base = batter_daily_stats.left_on_base + EXCLUDED.left_on_base,
                    flyouts = batter_daily_stats.flyouts + EXCLUDED.flyouts,
                    groundouts = batter_daily_stats.groundouts + EXCLUDED.groundouts,
                    linedrives = batter_daily_stats.linedrives + EXCLUDED.linedrives,
                    triple_play = batter_daily_stats.triple_play + EXCLUDED.triple_play,
                    pickoffs = batter_daily_stats.pickoffs + EXCLUDED.pickoffs,
                    intentional_base_on_balls = batter_daily_stats.intentional_base_on_balls + EXCLUDED.intentional_base_on_balls,
                    fielders_choice = batter_daily_stats.fielders_choice + EXCLUDED.fielders_choice,
                    grand_slams = batter_daily_stats.grand_slams + EXCLUDED.grand_slams,
                    solo_home_runs = batter_daily_stats.solo_home_runs + EXCLUDED.solo_home_runs,
                    two_run_home_runs = batter_daily_stats.two_run_home_runs + EXCLUDED.two_run_home_runs,
                    three_run_home_runs = batter_daily_stats.three_run_home_runs + EXCLUDED.three_run_home_runs,
                    games_played = batter_daily_stats.games_played + 1;
            `, [gameId, season_year, game_date]);

            await client.query(`
                INSERT INTO pitcher_daily_stats (
                    season_year, game_date, player_id, team_id,
                    games_played, games_started, outs_pitched, batters_faced,
                    pitches_thrown, hits_allowed, singles_allowed, doubles_allowed,
                    triples_allowed, home_runs_allowed, runs_allowed, earned_runs,
                    walks_allowed, intentional_walks_allowed, hit_batters, hit_by_pitch_allowed,
                    intentional_base_on_balls, strikeouts, wild_pitches, balks,
                    wins, losses, saves, holds, blown_saves,
                    flyouts, groundouts, linedrives, grounded_into_double_play,
                    triple_play, pickoffs,
                    quality_start, complete_game, shutout, perfect_game, no_hit
                )
                SELECT
                    $2, $3,
                    pgs.player_id, pgs.team_id,
                    1,
                    COALESCE(SUM(pgs.games_started), 0), COALESCE(SUM(pgs.outs_pitched), 0), COALESCE(SUM(pgs.batters_faced), 0),
                    COALESCE(SUM(pgs.pitches_thrown), 0), COALESCE(SUM(pgs.hits_allowed), 0), COALESCE(SUM(pgs.singles_allowed), 0),
                    COALESCE(SUM(pgs.doubles_allowed), 0), COALESCE(SUM(pgs.triples_allowed), 0), COALESCE(SUM(pgs.home_runs_allowed), 0),
                    COALESCE(SUM(pgs.runs_allowed), 0), COALESCE(SUM(pgs.earned_runs), 0), COALESCE(SUM(pgs.walks_allowed), 0),
                    COALESCE(SUM(pgs.intentional_walks_allowed), 0), COALESCE(SUM(pgs.hit_batters), 0), COALESCE(SUM(pgs.hit_by_pitch_allowed), 0),
                    COALESCE(SUM(pgs.intentional_base_on_balls), 0), COALESCE(SUM(pgs.strikeouts), 0), COALESCE(SUM(pgs.wild_pitches), 0),
                    COALESCE(SUM(pgs.balks), 0), COALESCE(SUM(pgs.wins), 0), COALESCE(SUM(pgs.losses), 0), COALESCE(SUM(pgs.saves), 0),
                    COALESCE(SUM(pgs.holds), 0), COALESCE(SUM(pgs.blown_saves), 0), COALESCE(SUM(pgs.flyouts), 0), COALESCE(SUM(pgs.groundouts), 0),
                    COALESCE(SUM(pgs.linedrives), 0), COALESCE(SUM(pgs.grounded_into_double_play), 0), COALESCE(SUM(pgs.triple_play), 0),
                    COALESCE(SUM(pgs.pickoffs), 0),
                    COALESCE(SUM(pgs.quality_start), 0), COALESCE(SUM(pgs.complete_game), 0), COALESCE(SUM(pgs.shutout), 0),
                    COALESCE(SUM(pgs.perfect_game), 0), COALESCE(SUM(pgs.no_hit), 0)
                FROM pitcher_game_stats pgs
                JOIN kbo_game_master kgm ON pgs.game_id = kgm.id
                WHERE kgm.id = $1
                GROUP BY pgs.player_id, pgs.team_id
                ON CONFLICT (season_year, player_id, team_id, game_date) DO UPDATE SET
                    games_played = pitcher_daily_stats.games_played + 1,
                    games_started = pitcher_daily_stats.games_started + EXCLUDED.games_started,
                    outs_pitched = pitcher_daily_stats.outs_pitched + EXCLUDED.outs_pitched,
                    batters_faced = pitcher_daily_stats.batters_faced + EXCLUDED.batters_faced,
                    pitches_thrown = pitcher_daily_stats.pitches_thrown + EXCLUDED.pitches_thrown,
                    hits_allowed = pitcher_daily_stats.hits_allowed + EXCLUDED.hits_allowed,
                    singles_allowed = pitcher_daily_stats.singles_allowed + EXCLUDED.singles_allowed,
                    doubles_allowed = pitcher_daily_stats.doubles_allowed + EXCLUDED.doubles_allowed,
                    triples_allowed = pitcher_daily_stats.triples_allowed + EXCLUDED.triples_allowed,
                    home_runs_allowed = pitcher_daily_stats.home_runs_allowed + EXCLUDED.home_runs_allowed,
                    runs_allowed = pitcher_daily_stats.runs_allowed + EXCLUDED.runs_allowed,
                    earned_runs = pitcher_daily_stats.earned_runs + EXCLUDED.earned_runs,
                    walks_allowed = pitcher_daily_stats.walks_allowed + EXCLUDED.walks_allowed,
                    intentional_walks_allowed = pitcher_daily_stats.intentional_walks_allowed + EXCLUDED.intentional_walks_allowed,
                    hit_batters = pitcher_daily_stats.hit_batters + EXCLUDED.hit_batters,
                    hit_by_pitch_allowed = pitcher_daily_stats.hit_by_pitch_allowed + EXCLUDED.hit_by_pitch_allowed,
                    intentional_base_on_balls = pitcher_daily_stats.intentional_base_on_balls + EXCLUDED.intentional_base_on_balls,
                    strikeouts = pitcher_daily_stats.strikeouts + EXCLUDED.strikeouts,
                    wild_pitches = pitcher_daily_stats.wild_pitches + EXCLUDED.wild_pitches,
                    balks = pitcher_daily_stats.balks + EXCLUDED.balks,
                    wins = pitcher_daily_stats.wins + EXCLUDED.wins,
                    losses = pitcher_daily_stats.losses + EXCLUDED.losses,
                    saves = pitcher_daily_stats.saves + EXCLUDED.saves,
                    holds = pitcher_daily_stats.holds + EXCLUDED.holds,
                    blown_saves = pitcher_daily_stats.blown_saves + EXCLUDED.blown_saves,
                    flyouts = pitcher_daily_stats.flyouts + EXCLUDED.flyouts,
                    groundouts = pitcher_daily_stats.groundouts + EXCLUDED.groundouts,
                    linedrives = pitcher_daily_stats.linedrives + EXCLUDED.linedrives,
                    grounded_into_double_play = pitcher_daily_stats.grounded_into_double_play + EXCLUDED.grounded_into_double_play,
                    triple_play = pitcher_daily_stats.triple_play + EXCLUDED.triple_play,
                    pickoffs = pitcher_daily_stats.pickoffs + EXCLUDED.pickoffs,
                    quality_start = pitcher_daily_stats.quality_start + EXCLUDED.quality_start,
                    complete_game = pitcher_daily_stats.complete_game + EXCLUDED.complete_game,
                    shutout = pitcher_daily_stats.shutout + EXCLUDED.shutout,
                    perfect_game = pitcher_daily_stats.perfect_game + EXCLUDED.perfect_game,
                    no_hit = pitcher_daily_stats.no_hit + EXCLUDED.no_hit;
            `, [gameId, season_year, game_date]);


            return sendSuccess(res, {
                message: "게임 통계를 일자 통계로 반영했습니다.",
            });
        });
    } catch (error) {
        return sendServerError(res, error, "일자 통계 반영 중 오류가 발생했습니다.");
    }
};


export const updateKboGameScore = async (req, res) => {
    const { gameId, homeScore, awayScore } = req.body;
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

    if (!gameId || homeScore == null || awayScore == null) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    try {
        await withTransaction(async (client) => {
            await client.query(`
                UPDATE kbo_game_master
                SET
                    home_team_score = $2,
                    away_team_score = $3,
                    updated_at = NOW()
                WHERE id = $1
            `, [gameId, homeScore, awayScore]);

            return sendSuccess(res, {
                message: "게임 점수가 성공적으로 업데이트되었습니다.",
            });
        });
    } catch (error) {
        return sendServerError(res, error, "게임 상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const getKboGameCompletedInfo = async (req, res) => {
    const { gameId } = req.params;

    if (!gameId) {
        return sendBadRequest(res, "게임 정보가 잘못되었습니다.");
    }

    try {
        const gameCompletedInfoQuery = `
            SELECT 
                player_id,
                team_id,
                'win' AS role
            FROM pitcher_game_stats
            WHERE game_id = $1 AND wins = 1

            UNION ALL

            SELECT 
                player_id,
                team_id,
                'loss' AS role
            FROM pitcher_game_stats
            WHERE game_id = $1 AND losses = 1

            UNION ALL

            SELECT 
                player_id,
                team_id,
                'save' AS role
            FROM pitcher_game_stats
            WHERE game_id = $1 AND saves = 1

            UNION ALL

            SELECT 
                player_id,
                team_id,
                'hold' AS role
            FROM pitcher_game_stats
            WHERE game_id = $1 AND holds > 0

            UNION ALL

            SELECT 
                player_id,
                team_id,
                'blown_save' AS role
            FROM pitcher_game_stats
            WHERE game_id = $1 AND blown_saves > 0
        `;

        const { rows } = await query(gameCompletedInfoQuery, [gameId]);

        const gameCompletedInfo = {
            win: rows.find(r => r.role === 'win') || null,
            loss: rows.find(r => r.role === 'loss') || null,
            save: rows.find(r => r.role === 'save') || null,
            hold: rows.filter(r => r.role === 'hold'),
            blown_save: rows.filter(r => r.role === 'blown_save'),
        };

        const fullStatsQuery = `
            WITH base_game_id_cte AS (
                SELECT 
                    COALESCE(suspended_game_id, id) AS base_game_id
                FROM kbo_game_master
                WHERE id = $1
            ),
            related_game_ids_cte AS (
                SELECT id AS game_id
                FROM kbo_game_master
                WHERE COALESCE(suspended_game_id, id) = (SELECT base_game_id FROM base_game_id_cte)
            ),
            roster_base AS (
                SELECT DISTINCT ON (
                    CASE 
                        WHEN kgr.replaced_by IS NOT NULL THEN kgr.replaced_by 
                        ELSE kgr.player_id
                    END
                )
                    CASE 
                        WHEN kgr.team_id = kgm.away_team_id THEN 'away'
                        ELSE 'home'
                    END AS team_type,
                    kgr.id AS roster_id,
                    kgr.game_id,
                    kgr.team_id,
                    ktm.name AS team_name,
                    CASE 
                        WHEN kgr.replaced_by IS NOT NULL THEN kgr.replaced_by 
                        ELSE kgr.player_id
                    END AS player_id,
                    CASE 
                        WHEN kgr.replaced_by IS NOT NULL THEN krp.name 
                        ELSE kp.name 
                    END AS player_name,
                    kgr.batting_order,
                    kgr.role,
                    kgr.replaced_by,
                    kgr.replaced_inning,
                    kgr.replaced_out,
                    kgr.replaced_position,
                    kgr.created_at,
                    kgr.updated_at,
                    kgr.position,
                    COALESCE(krp.batting_hand,kp.batting_hand) as batting_hand,
                    COALESCE(krp.throwing_hand,kp.throwing_hand) as throwing_hand,
                    CASE 
                        WHEN kgr.replaced_by IS NOT NULL THEN krp.player_type
                        ELSE kp.player_type
                    END AS player_type
                FROM kbo_game_roster kgr
                JOIN kbo_game_master kgm ON kgr.game_id = kgm.id
                JOIN related_game_ids_cte rgic ON kgr.game_id = rgic.game_id
                LEFT JOIN kbo_team_master ktm ON kgr.team_id = ktm.id
                LEFT JOIN kbo_player_master kp ON kgr.player_id = kp.id
                LEFT JOIN kbo_player_master krp ON kgr.replaced_by = krp.id
                ORDER BY 
                    CASE 
                        WHEN kgr.replaced_by IS NOT NULL THEN kgr.replaced_by 
                        ELSE kgr.player_id
                    END,
                    kgr.replaced_inning NULLS FIRST,
                    kgr.replaced_out NULLS FIRST
            ),
            batter_stats AS (
                SELECT 
                    player_id,
                    COALESCE(SUM(plate_appearances), 0) AS plate_appearances,
                    COALESCE(SUM(at_bats), 0) AS at_bats,
                    COALESCE(SUM(hits), 0) AS hits,
                    COALESCE(SUM(singles), 0) AS singles,
                    COALESCE(SUM(doubles), 0) AS doubles,
                    COALESCE(SUM(triples), 0) AS triples,
                    COALESCE(SUM(home_runs), 0) AS home_runs,
                    COALESCE(SUM(runs_batted_in), 0) AS rbi,
                    COALESCE(SUM(runs), 0) AS runs,
                    COALESCE(SUM(walks), 0) AS walks,
                    COALESCE(SUM(intentional_base_on_balls), 0) AS intentional_base_on_balls,
                    COALESCE(SUM(strikeouts), 0) AS strikeouts,
                    COALESCE(SUM(hit_by_pitch), 0) AS hit_by_pitch,
                    COALESCE(SUM(sacrifice_bunts), 0) AS sac_bunts,
                    COALESCE(SUM(sacrifice_flies), 0) AS sac_flies,
                    COALESCE(SUM(stolen_bases), 0) AS stolen_bases,
                    COALESCE(SUM(caught_stealings), 0) AS caught_stealings,
                    COALESCE(SUM(errors), 0) AS errors
                FROM batter_game_stats
                WHERE game_id IN (SELECT game_id FROM related_game_ids_cte)
                GROUP BY player_id
            ),
            pitcher_stats AS (
                SELECT
                    player_id,
                    COALESCE(SUM(outs_pitched), 0) AS outs_pitched,
                    COALESCE(SUM(batters_faced), 0) AS batters_faced,
                    COALESCE(SUM(pitches_thrown), 0) AS pitches_thrown,
                    COALESCE(SUM(hits_allowed), 0) AS hits_allowed,
                    COALESCE(SUM(home_runs_allowed), 0) AS home_runs_allowed,
                    COALESCE(SUM(runs_allowed), 0) AS runs_allowed,
                    COALESCE(SUM(earned_runs), 0) AS earned_runs,
                    COALESCE(SUM(walks_allowed), 0) AS walks_allowed,
                    COALESCE(SUM(strikeouts), 0) AS strikeouts,
                    COALESCE(SUM(wild_pitches), 0) AS wild_pitches,
                    COALESCE(SUM(wins), 0) AS wins,
                    COALESCE(SUM(losses), 0) AS losses,
                    COALESCE(SUM(saves), 0) AS saves,
                    COALESCE(SUM(holds), 0) AS holds,
                    COALESCE(SUM(blown_saves), 0) AS blown_saves
                FROM pitcher_game_stats
                WHERE game_id IN (SELECT game_id FROM related_game_ids_cte)
                GROUP BY player_id
            )
            SELECT
                rb.*,
                -- 타자 스탯
                COALESCE(bs.plate_appearances, 0) AS plate_appearances,
                COALESCE(bs.at_bats, 0) AS at_bats,
                COALESCE(bs.hits, 0) AS hits,
                COALESCE(bs.singles, 0) AS singles,
                COALESCE(bs.doubles, 0) AS doubles,
                COALESCE(bs.triples, 0) AS triples,
                COALESCE(bs.home_runs, 0) AS home_runs,
                COALESCE(bs.rbi, 0) AS rbi,
                COALESCE(bs.runs, 0) AS runs,
                COALESCE(bs.walks, 0) AS walks,
                COALESCE(bs.intentional_base_on_balls, 0) AS intentional_base_on_balls,
                COALESCE(bs.strikeouts, 0) AS batter_strikeouts,
                COALESCE(bs.hit_by_pitch, 0) AS hit_by_pitch,
                COALESCE(bs.sac_bunts, 0) AS sacrifice_bunts,
                COALESCE(bs.sac_flies, 0) AS sacrifice_flies,
                COALESCE(bs.stolen_bases, 0) AS stolen_bases,
                COALESCE(bs.caught_stealings, 0) AS caught_stealings,
                COALESCE(bs.errors, 0) AS batter_errors,
                -- 투수 스탯
                COALESCE(ps.outs_pitched, 0)::int AS outs_pitched,
                FLOOR(COALESCE(ps.outs_pitched, 0) / 3)::int AS innings_full,
                CASE COALESCE(ps.outs_pitched, 0) % 3
                    WHEN 0 THEN ''
                    WHEN 1 THEN '⅓'
                    WHEN 2 THEN '⅔'
                END AS partial_outs,
                CONCAT(
                    FLOOR(COALESCE(ps.outs_pitched, 0) / 3)::int, ' ',
                    CASE COALESCE(ps.outs_pitched, 0) % 3
                        WHEN 0 THEN ''
                        WHEN 1 THEN '⅓'
                        WHEN 2 THEN '⅔'
                    END
                ) AS outs_pitched_display,
                COALESCE(ps.batters_faced, 0) AS batters_faced,
                COALESCE(ps.pitches_thrown, 0) AS pitches_thrown,
                COALESCE(ps.hits_allowed, 0) AS hits_allowed,
                COALESCE(ps.home_runs_allowed, 0) AS home_runs_allowed,
                COALESCE(ps.runs_allowed, 0) AS runs_allowed,
                COALESCE(ps.earned_runs, 0) AS earned_runs,
                COALESCE(ps.walks_allowed, 0) AS walks_allowed,
                COALESCE(ps.strikeouts, 0) AS pitcher_strikeouts,
                COALESCE(ps.wild_pitches, 0) AS wild_pitches,
                COALESCE(ps.wins, 0) AS wins,
                COALESCE(ps.losses, 0) AS losses,
                COALESCE(ps.saves, 0) AS saves,
                COALESCE(ps.holds, 0) AS holds,
                COALESCE(ps.blown_saves, 0) AS blown_saves
            FROM roster_base rb
            LEFT JOIN batter_stats bs ON bs.player_id = rb.player_id
            LEFT JOIN pitcher_stats ps ON ps.player_id = rb.player_id
            ORDER BY
                rb.batting_order,
                COALESCE(rb.replaced_inning, 0),
                COALESCE(rb.replaced_out, 0),
                rb.roster_id;

        `;
        const { rows: fullPlayerStats } = await query(fullStatsQuery, [gameId]);

        return sendSuccess(res, {
            message: "게임 완료 정보를 성공적으로 조회했습니다.",
            gameCompletedInfo,
            fullPlayerStats
        });
    } catch (error) {
        return sendServerError(res, error, "게임 완료 정보 조회 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};
