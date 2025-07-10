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

                const draft_room_id = draft_rooms[0]?.id

                const io = getIO();

                io.to(`${league_id}_${season_id}`).emit('createDraftRoom', {
                    draft_room_id: draft_rooms[0].id,
                    starts_at: draft_start_date,
                    message: "드래프트 룸이 성공적으로 생성되었습니다."
                });

                console.log(`🎯 draft_room 생성됨: league_id=${league_id}, season_id=${season_id}`);

                // 1. 리그명 조회
                const { rows: leagueRows } = await client.query(`
                    SELECT league_name
                    FROM league_master
                    WHERE league_id = $1
                `, [league_id]);

                const leagueName = leagueRows[0]?.league_name || '해당';

                // 2. 소속 유저 조회
                const { rows: users } = await client.query(`
                    SELECT user_id
                    FROM league_season_team
                    WHERE league_id = $1 AND season_id = $2
                `, [league_id, season_id]);

                // 3. 알림 저장 + 개별 소켓 emit
                const now = dayjs();
                const formattedStart = dayjs(draft_start_date).format('YYYY-MM-DD HH:mm');
                const messageText = `${leagueName} 리그의 드래프트가 ${formattedStart}에 진행됩니다!\n이제 드래프트 룸에 입장할 수 있습니다.`;

                const insertValues = [];
                const insertParams = [];

                users.forEach(({ user_id }, index) => {
                    const paramIndex = index * 8;
                    insertValues.push(`($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`);

                    insertParams.push(
                        user_id,                 // user_id
                        'draft',                 // type
                        '드래프트 시작 알림',     // title
                        messageText,            // message
                        'unread',                // status
                        null,                    // url
                        draft_room_id,          // related_id
                        'draft_room'            // related_type
                    );

                    // 소켓 알림 emit
                    io.to(`user_${user_id}`).emit('notification', {
                        type: 'draft',
                        title: '드래프트 시작 알림',
                        message: messageText,
                        related_id: draft_room_id,
                        related_type: 'draft_room',
                        timestamp: now.toISOString()
                    });
                });

                // 4. 알림 bulk insert
                await client.query(`
                    INSERT INTO notifications (
                        user_id, type, title, message,
                        status, url, related_id, related_type
                    ) VALUES ${insertValues.join(',')}
                `, insertParams);
            });
        }
    } catch (error) {
        console.error('드래프트 시작 대상 조회/생성 중 에러:', error);
    }
});

const alertJob = schedule.scheduleJob('0 * * * * *', async () => {
    console.log(`[${dayjs().format('YYYY.MM.DD HH:mm:ss')}] 드래프트 10분 전 알림 체크 중...`);

    const now = dayjs();
    const tenMinutesLater = now.add(10, 'minute');

    try {
        const alertQuery = `
            SELECT dr.id AS draft_room_id, dr.league_id, dr.season_id, dr.started_at
            FROM draft_rooms dr
            WHERE dr.status = 'waiting'
            AND dr.started_at BETWEEN NOW() AND $1
        `;

        const { rows } = await query(alertQuery, [tenMinutesLater.toDate()]);
        for (const row of rows) {
            const { league_id, season_id, draft_room_id, started_at } = row;

            const io = getIO();

            io.to(`${league_id}_${season_id}`).emit('draftAlert', {
                type: 'draftSoon',
                data: {
                    draft_room_id,
                    starts_at: started_at,
                    message: '드래프트 시작까지 10분 남았습니다. 준비하세요!'
                }
            });

            console.log(`⏰ 10분 전 알림 전송: league_id=${league_id}, season_id=${season_id}`);
        }
    } catch (error) {
        console.error('10분 전 알림 처리 중 에러:', error);
    }
});