import schedule from 'node-schedule';
import { query, withTransaction } from '../db.js'; // DB 연결 모듈
import dayjs from 'dayjs'
import { getIO } from '../utils/socket.js';

// 매 분 0초에 실행 (초 분 시 일 월 요일)
const job = schedule.scheduleJob('0 * * * * *', async () => {
    console.log(`[${dayjs().format('YYYY.MM.DD HH:mm:ss')}] 드래프트 시작 대상 조회 중...`);

    const now = dayjs();
    const thirtyMinutesLater = now.add(30, 'minute');

    const draftCandidatesQuery = `
        SELECT d.id AS draft_master_id, d.league_id, d.season_id, s.max_teams, d.draft_timer
        FROM league_season_draft_master d
        JOIN league_season s ON d.season_id = s.season_id
        LEFT JOIN league_season_draft_teams dt ON dt.league_id = d.league_id AND dt.season_id = d.season_id
        WHERE d.draft_start_date BETWEEN NOW() AND $1
        GROUP BY d.id, d.league_id, d.season_id, s.max_teams, d.draft_timer
        HAVING COUNT(dt.id) = s.max_teams
    `;

    try {
        const { rows } = await query(draftCandidatesQuery, [thirtyMinutesLater.toDate()]);
        console.log('draftCandidates:', rows, 'thirtyMinutesLater:', thirtyMinutesLater.format());

        for (const draft of rows) {
            const { league_id, season_id, draft_master_id, max_teams, draft_timer } = draft;

            // 이미 draft_room이 존재하는지 확인
            const existsCheck = await query(
                `SELECT 1 FROM draft_rooms WHERE league_id = $1 AND season_id = $2`,
                [league_id, season_id]
            );

            if (existsCheck.rowCount > 0) {
                console.log(`✅ 이미 draft_room 있음: league_id=${league_id}, season_id=${season_id}`);
                continue;
            }

            // draft_rooms 생성 트랜잭션
            await withTransaction(async (client) => {
                // draft_master에서 시작 시간, 타이머 가져오기
                const draftConfigResult = await client.query(`
                    SELECT draft_start_date, draft_timer
                    FROM league_season_draft_master
                    WHERE id = $1
                `, [draft_master_id]);

                const { draft_start_date, draft_timer: dbDraftTimer } = draftConfigResult.rows[0];

                // draft_rooms 생성
                const { rows : draft_rooms } = await client.query(`
                    INSERT INTO draft_rooms (
                        league_id,
                        season_id,
                        status,
                        total_slots,
                        timer_seconds,
                        started_at,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, 'waiting', $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                `, [
                    league_id,
                    season_id,
                    max_teams,
                    dbDraftTimer,
                    draft_start_date
                ]);

                const io = getIO();

                io.emit(league_id+"_"+season_id, {
                    type: 'createDraftRoom',
                    data: { 
                        draft_room_id : draft_rooms[0].id
                    },
                    message : "드래프트 룸이 성공적으로 생성되었습니다."
                });

                console.log(`🎯 draft_room 생성됨: league_id=${league_id}, season_id=${season_id}`);
            });
        }
    } catch (error) {
        console.error('드래프트 시작 대상 조회/생성 중 에러:', error);
    }
});
