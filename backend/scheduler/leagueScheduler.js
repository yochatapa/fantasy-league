import schedule from 'node-schedule';
import { query, withTransaction } from '../db.js'; // DB 연결 모듈 (데이터베이스 트랜잭션 관리를 위함)
import dayjs from 'dayjs'; // 날짜와 시간 처리를 위한 라이브러리
import { getIO } from '../utils/socket.js'; // Socket.IO 서버 인스턴스를 가져오는 유틸리티 함수
import { encryptData, decryptData } from '../utils/crypto.js'; // 암호화/복호화 유틸리티 (기존 코드에 있었으나, 이 파일에서 직접 사용되지는 않음)

// --- 시즌 시작 로직을 위한 헬퍼 함수들 ---

/**
 * 특정 리그 시즌의 주차별 경기 일정을 생성합니다.
 * 이 함수는 `league_season_match` 테이블에 데이터를 삽입합니다.
 * @param {object} client - PostgreSQL 트랜잭션 클라이언트 인스턴스
 * @param {number} leagueId - 리그 고유 ID
 * @param {number} seasonId - 시즌 고유 ID (league_season의 season_id)
 */
async function createSeasonMatchups(client, leagueId, seasonId) {
    console.log(`[경기 일정 생성] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 경기 일정 생성 시작.`);

    // 1. 해당 리그의 시작 날짜, 시즌 연도, 그리고 참여 팀 목록을 조회합니다.
    const { rows: leagueSeasonInfo } = await client.query(`
        SELECT ls.start_date, ls.season_year, lt.id AS team_id
        FROM league_season ls
        INNER JOIN league_season_team lt ON ls.league_id = lt.league_id AND ls.season_id = lt.season_id
        WHERE ls.league_id = $1 AND ls.season_id = $2
        ORDER BY lt.id
    `, [leagueId, seasonId]);

    if (leagueSeasonInfo.length < 2) {
        console.warn(`[경기 일정 생성] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 팀 수가 부족하여 경기 일정을 생성할 수 없습니다. (현재 팀 수: ${leagueSeasonInfo.length}개)`);
        return;
    }

    const leagueStartDate = leagueSeasonInfo[0].start_date;
    const leagueSeasonYear = leagueSeasonInfo[0].season_year;
    const teamIds = leagueSeasonInfo.map(t => t.team_id);
    const numTeams = teamIds.length;

    // 2. league_season의 season_year를 이용해 kbo_season_master의 id를 조회합니다.
    // 이 ID를 사용하여 kbo_season_week 테이블을 조회하는 것이 더 명확합니다.
    const { rows: kboMaster } = await client.query(`
        SELECT id FROM kbo_season_master WHERE season_year = $1
    `, [leagueSeasonYear]);
    
    if (kboMaster.length === 0) {
        console.warn(`[경기 일정 생성] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 시즌 연도(${leagueSeasonYear})에 해당하는 KBO 시즌 마스터 정보가 없습니다.`);
        return;
    }
    
    const kboSeasonId = kboMaster[0].id;

    // 3. 리그 시작일 이후에 시작하는 KBO 주차 정보를 조회합니다.
    const { rows: kboWeeks } = await client.query(`
        SELECT
            ks.id AS week_id,
            ks.week_number,
            ks.week_start_date
        FROM kbo_season_week ks
        WHERE ks.season_id = $1 AND ks.week_start_date >= $2::date
        ORDER BY ks.week_number
    `, [kboSeasonId, leagueStartDate]);

    if (kboWeeks.length === 0) {
        console.warn(`[경기 일정 생성] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 리그 시작일(${leagueStartDate}) 이후의 KBO 주차 정보가 없어 경기 일정을 생성할 수 없습니다.`);
        return;
    }
    
    // 팀 수가 홀수일 경우, 부전승(bye)을 위한 더미 팀을 추가
    const teamsForSchedule = [...teamIds];
    const hasByeWeek = numTeams % 2 !== 0;
    if (hasByeWeek) {
        teamsForSchedule.push(null);
    }

    const matchupsToInsert = [];
    const rotationTeams = teamsForSchedule.slice(1);
    const fixedTeam = teamsForSchedule[0];

    // 4. 라운드 로빈(Round Robin) 알고리즘으로 대진표 생성
    for (const week of kboWeeks) {
        const matchesInWeek = [];
        // 고정 팀과 첫 번째 회전 팀 매치업
        if (fixedTeam !== null) {
            const awayTeam = rotationTeams[rotationTeams.length - 1];
            if (awayTeam !== null) {
                 matchesInWeek.push({ home: fixedTeam, away: awayTeam });
            }
        }
        
        // 나머지 팀들 매치업
        for (let i = 0; i < rotationTeams.length / 2; i++) {
            const homeTeam = rotationTeams[i];
            const awayTeam = rotationTeams[rotationTeams.length - 1 - i];
            
            // 부전승 팀은 매치업에서 제외
            if (homeTeam !== null && awayTeam !== null && homeTeam !== awayTeam) {
                matchesInWeek.push({ home: homeTeam, away: awayTeam });
            }
        }

        // 생성된 매치업 데이터를 matchupsToInsert에 추가
        matchesInWeek.forEach(match => {
            matchupsToInsert.push({
                league_id: leagueId,
                season_id: seasonId,
                week_id: week.week_id,
                week_number: week.week_number,
                home_team_id: match.home,
                away_team_id: match.away,
                match_date: week.week_start_date
            });
        });

        // 다음 주차를 위한 팀 로테이션
        if (rotationTeams.length > 0) {
            const lastTeam = rotationTeams.pop();
            rotationTeams.unshift(lastTeam);
        }
    }


    // 5. 데이터베이스에 매치업 데이터 삽입
    if (matchupsToInsert.length > 0) {
        const valuePlaceholders = matchupsToInsert.map((_, index) => {
            const offset = index * 8;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        }).join(',');

        const values = matchupsToInsert.flatMap(m => [
            m.league_id, m.season_id, m.week_id, m.week_number,
            m.home_team_id, m.away_team_id, m.match_date, m.match_status || 'scheduled'
        ]);

        await client.query(`
            INSERT INTO league_season_match
            (league_id, season_id, week_id, week_number, home_team_id, away_team_id, match_date, match_status, created_at, updated_at)
            VALUES ${valuePlaceholders}
            ON CONFLICT (league_id, season_id, week_id, home_team_id, away_team_id) DO NOTHING;
        `, values);
        console.log(`[경기 일정 생성] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 총 ${matchupsToInsert.length}개의 경기 일정 삽입 완료.`);
    } else {
        console.log(`[경기 일정 생성] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 생성된 경기 일정이 없습니다.`);
    }
}


/**
 * 리그 시즌 내 각 팀의 초기 통계(승리, 패배, 무승부, 득점, 실점 등)를 0으로 초기화합니다.
 * 이 함수는 `league_team_standings` 테이블에 데이터를 삽입/업데이트합니다.
 * @param {object} client - PostgreSQL 트랜잭션 클라이언트 인스턴스
 * @param {number} leagueId - 리그 고유 ID
 * @param {number} seasonId - 시즌 고유 ID
 */
async function initializeSeasonTeamStandings(client, leagueId, seasonId) {
    console.log(`[팀 성적 초기화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 팀 성적 초기화 시작.`);

    // 해당 리그 시즌에 속한 모든 팀을 조회합니다.
    const { rows: teams } = await client.query(`
        SELECT lt.id AS team_id
        FROM league_season_team lt
        WHERE lt.league_id = $1 AND lt.season_id = $2
    `, [leagueId, seasonId]);

    if (teams.length === 0) {
        console.warn(`[팀 성적 초기화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 초기화할 팀이 없습니다.`);
        return;
    }

    // 각 팀별로 초기화할 성적 데이터를 생성합니다.
    const standingsToInsert = teams.map(team => ({
        league_id: leagueId,
        season_id: seasonId,
        team_id: team.team_id,
        wins: 0,
        losses: 0,
        ties: 0,
        points_for: 0.00,    // 획득한 총 판타지 포인트
        points_against: 0.00, // 상대방에게 허용한 총 판타지 포인트
        rank: 0              // 초기 랭크는 0 또는 NULL로 설정 후 추후 계산
    }));

    if (standingsToInsert.length > 0) {
        const valuePlaceholders = standingsToInsert.map((_, index) => {
            const offset = index * 9; // 각 행에 9개의 컬럼 (rank 포함)
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        }).join(',');

        const values = standingsToInsert.flatMap(s => [
            s.league_id, s.season_id, s.team_id,
            s.wins, s.losses, s.ties, s.points_for, s.points_against, s.rank
        ]);

        await client.query(`
            INSERT INTO league_team_standings
            (league_id, season_id, team_id, wins, losses, ties, points_for, points_against, rank, created_at, updated_at)
            VALUES ${valuePlaceholders}
            ON CONFLICT (league_id, season_id, team_id) DO UPDATE SET
                wins = EXCLUDED.wins,
                losses = EXCLUDED.losses,
                ties = EXCLUDED.ties,
                points_for = EXCLUDED.points_for,
                points_against = EXCLUDED.points_against,
                rank = EXCLUDED.rank,
                updated_at = CURRENT_TIMESTAMP;
        `, values);
        console.log(`[팀 성적 초기화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 총 ${standingsToInsert.length}개 팀 성적 초기화 완료.`);
    } else {
        console.log(`[팀 성적 초기화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 초기화할 팀 성적이 없습니다.`);
    }
}

/**
 * 트레이드 및 와이버(FA 영입) 시스템 관련 설정을 활성화합니다.
 * 이 함수는 `league_season` 테이블의 `allow_trades` 컬럼을 업데이트합니다.
 * @param {object} client - PostgreSQL 트랜잭션 클라이언트 인스턴스
 * @param {number} leagueId - 리그 고유 ID
 * @param {number} seasonId - 시즌 고유 ID
 */
async function activateTradeWaiverSystem(client, leagueId, seasonId) {
    console.log(`[트레이드/와이버 활성화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 시스템 활성화 시작.`);
    // `league_season` 테이블의 `allow_trades` 컬럼을 `TRUE`로 설정하여 트레이드를 허용합니다.
    // `trade_deadline`, `waiver_clear_days` 등은 드래프트 전에 이미 설정되었을 수 있습니다.
    await client.query(`
        UPDATE league_season
        SET
            allow_trades = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE league_id = $1 AND season_id = $2
    `, [leagueId, seasonId]);
    console.log(`[트레이드/와이버 활성화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 트레이드 시스템 활성화 완료.`);

    // 와이버 시스템 활성화 로직이 별도의 플래그(`allow_waiver` 등)로 관리된다면,
    // `league_season` DDL에 해당 컬럼을 추가한 후 여기서 함께 업데이트합니다.
}

/**
 * 드래프트된 플레이어들의 `is_active` 상태를 초기화합니다.
 * (대부분의 경우 드래프트 시 이미 활성화되지만, 안전을 위한 확인/재설정 용도입니다.)
 * 이 함수는 `league_season_team_rosters` 테이블을 업데이트합니다.
 * @param {object} client - PostgreSQL 트랜잭션 클라이언트 인스턴스
 * @param {number} leagueId - 리그 고유 ID
 * @param {number} seasonId - 시즌 고유 ID
 */
async function initializePlayerStatus(client, leagueId, seasonId) {
    console.log(`[선수 상태 초기화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 선수 상태 초기화 시작.`);
    // 해당 리그 시즌에 속한 모든 로스터 선수를 `is_active = TRUE`로 설정합니다.
    await client.query(`
        UPDATE league_season_team_rosters
        SET
            is_active = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE league_id = $1 AND season_id = $2;
    `, [leagueId, seasonId]);
    console.log(`[선수 상태 초기화] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 모든 선수 활성 상태로 초기화 완료.`);

    // 필요시 부상자 명단(IL) 초기화 등 추가적인 선수 상태 관련 로직을 여기에 구현할 수 있습니다.
    // 예: 시즌 시작 시 모든 선수를 IL에서 해제 (단, KBO 실제 부상 여부와는 별개)
}

/**
 * Socket.IO를 통해 리그 참가 사용자들에게 시즌 시작 알림을 개별적으로 전송합니다.
 * @param {object} client - PostgreSQL 트랜잭션 클라이언트 인스턴스
 * @param {object} io - Socket.IO 서버 인스턴스 (`getIO()`를 통해 얻은 객체)
 * @param {number} leagueId - 리그 고유 ID
 * @param {number} seasonId - 시즌 고유 ID
 */
async function notifyLeagueStarted(client, io, leagueId, seasonId) {
    console.log(`[알림] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 사용자들에게 개별 알림 전송 시작.`);

    // 1. 해당 리그에 속한 모든 사용자의 ID를 데이터베이스에서 조회합니다.
    const { rows: users } = await client.query(`
        SELECT user_id
        FROM league_season_team
        WHERE league_id = $1 AND season_id = $2
    `, [leagueId, seasonId]);

    if (users.length === 0) {
        console.warn(`[알림] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 알림을 보낼 사용자가 없습니다.`);
        return;
    }

    // 2. 각 사용자에게 개별적으로 소켓 알림을 보냅니다.
    users.forEach(({ user_id }) => {
        io.to(`user_${user_id}`).emit('league:started', {
            leagueId: leagueId,
            seasonId: seasonId,
            message: '리그 시즌이 공식적으로 시작되었습니다! 지금 바로 경기를 확인하세요!',
        });
    });

    console.log(`[알림] 리그 ID: ${leagueId}, 시즌 ID: ${seasonId} - 총 ${users.length}명에게 개별 알림 전송 완료.`);
}

// --- 시즌 시작 스케줄러: 매일 자정 (새벽 0시 0분 0초)에 실행 ---
// '0 0 0 * * *' : 초 분 시 일 월 요일
const startLeagueSeasonJob = schedule.scheduleJob('0 * * * * *', async () => {
    const now = dayjs(); // 현재 시각
    const today = now.format('YYYY-MM-DD'); // 오늘 날짜 (YYYY-MM-DD 형식, KST 기준)

    console.log(`\n--- [시즌 시작 스케줄러] 실행 시작: ${now.format('YYYY-MM-DD HH:mm:ss')} ---`);

    try {
        // 모든 시즌 시작 관련 작업을 하나의 데이터베이스 트랜잭션으로 묶어 원자성을 보장합니다.
        // 즉, 이 트랜잭션 내의 모든 작업이 성공해야만 변경 사항이 커밋되고, 하나라도 실패하면 전체가 롤백됩니다.
        await withTransaction(async (client) => {
            // 1. 현재 날짜 기준으로 시작해야 하며, 'pending' 상태이고, 드래프트가 완료된(`finished`) 리그 시즌들을 조회합니다.
            const { rows: readyToStartSeasons } = await client.query(`
                SELECT
                    ls.season_id,
                    ls.league_id,
                    ls.season_year,
                    ls.start_date,
                    ls.max_teams
                FROM league_season ls
                INNER JOIN draft_rooms dr ON ls.league_id = dr.league_id AND ls.season_id = dr.season_id
                WHERE ls.season_status = 'pending'
                AND ls.start_date <= $1::date
                AND dr.status = 'finished'
            `, [today]);

            if (readyToStartSeasons.length === 0) {
                console.log(`[시즌 시작 스케줄러] 오늘 날짜(${today}) 기준으로 시작할 리그 시즌이 없습니다. (드래프트 미완료 시즌 포함)`);
                return; // 시작할 시즌이 없으면 함수 종료
            }

            console.log(`[시즌 시작 스케줄러] 총 ${readyToStartSeasons.length}개의 시작할 리그 시즌 발견.`);

            // Socket.IO 인스턴스를 가져옵니다. (알림 전송에 사용)
            const io = getIO();
            if (!io) {
                console.error("❌ Socket.IO 인스턴스를 가져올 수 없습니다. 리그 시작 알림 기능이 작동하지 않을 수 있습니다.");
                // 하지만 데이터베이스 관련 작업은 Socket.IO와 무관하게 계속 진행되어야 합니다.
            }

            // 시작해야 할 각 리그 시즌별로 처리합니다.
            for (const season of readyToStartSeasons) {
                console.log(`\n--- [시즌 시작 처리] 리그 ID: ${season.league_id}, 시즌 ID: ${season.season_id} 시작 ---`);

                // 2. 해당 시즌의 상태를 'active'(활성)로 업데이트합니다.
                await client.query(`
                    UPDATE league_season
                    SET season_status = 'active', updated_at = CURRENT_TIMESTAMP
                    WHERE league_id = $1 AND season_id = $2
                `, [season.league_id, season.season_id]);
                console.log(`✅ 리그 시즌 활성화됨: 리그 ID=${season.league_id}, 시즌 ID=${season.season_id}`);

                // 3. 리그 시작 시 필요한 추가 초기화 로직들을 순차적으로 실행합니다.
                try {
                    // 3-1. 주차별 경기 일정을 생성합니다.
                    await createSeasonMatchups(client, season.league_id, season.season_id);

                    // 3-2. 각 팀의 시즌 성적(승패, 득점 등)을 0으로 초기화합니다.
                    await initializeSeasonTeamStandings(client, season.league_id, season.season_id);

                    // 3-3. 로스터 선수들의 활성 상태를 초기화합니다. (필요시)
                    await initializePlayerStatus(client, season.league_id, season.season_id);

                    // 3-4. 트레이드 및 와이버 시스템을 활성화합니다.
                    await activateTradeWaiverSystem(client, season.league_id, season.season_id);

                    // 3-5. 사용자들에게 리그 시작 알림을 전송합니다. (Socket.IO 인스턴스가 있을 경우)
                    if (io) {
                        await notifyLeagueStarted(client, io, season.league_id, season.season_id);
                    }

                    console.log(`✅ 리그 ID: ${season.league_id}, 시즌 ID: ${season.season_id} - 모든 시즌 시작 추가 로직 완료.`);

                } catch (subTaskError) {
                    console.error(`❌ 리그 ID: ${season.league_id}, 시즌 ID: ${season.season_id} - 시즌 시작 추가 로직 중 에러 발생:`, subTaskError);
                    throw subTaskError; 
                }
            }
        });
        console.log(`\n--- [시즌 시작 스케줄러] 전체 실행 완료. ---`);

    } catch (error) {
        console.error('❌ [시즌 시작 스케줄러] 메인 실행 중 에러 발생:', error);
    }
});