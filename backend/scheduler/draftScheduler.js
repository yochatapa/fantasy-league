import schedule from 'node-schedule';
import { query, withTransaction } from '../db.js'; // DB 연결 모듈
import dayjs from 'dayjs'
import { getIO } from '../utils/socket.js';
import activeDraftRooms from '../utils/draft/activeDraftRooms.js';
import DraftRoom from '../utils/draft/draftRoom.js';
import { encryptData, decryptData } from '../utils/crypto.js';

// --- Modified 'job' for creating DraftRoom instance 30 minutes before ---
// 매 분 0초에 실행 (초 분 시 일 월 요일)
const createDraftRoomJob = schedule.scheduleJob('0 * * * * *', async () => {
    console.log(`[${dayjs().format('YYYY.MM.DD HH:mm:ss')}] 드래프트 룸 생성 대상 조회 중...`);

    const now = dayjs();
    // Look for drafts starting within the next 30 minutes to create the room
    const thirtyMinutesLater = now.add(30, 'minute');

    const draftCandidatesQuery = `
        SELECT d.id AS draft_master_id, d.league_id, d.season_id, s.max_teams, d.draft_timer, d.draft_start_date
        FROM league_season_draft_master d
        JOIN league_season s ON d.season_id = s.season_id
        LEFT JOIN league_season_draft_teams dt ON dt.league_id = d.league_id AND dt.season_id = d.season_id
        WHERE d.draft_start_date BETWEEN NOW() AND $1
        GROUP BY d.id, d.league_id, d.season_id, s.max_teams, d.draft_timer, d.draft_start_date
        HAVING COUNT(dt.id) = s.max_teams
    `;
    try {
        const { rows } = await query(draftCandidatesQuery, [thirtyMinutesLater.toDate()]);
        console.log('draftCandidates (for room creation):', rows.length, 'thirtyMinutesLater:', thirtyMinutesLater.format());

        for (const draft of rows) {
            const { league_id, season_id, draft_master_id, max_teams, draft_timer, draft_start_date } = draft;
            const roomKey = `${league_id}_${season_id}`;

            // Check if draft_room already exists in DB OR in activeDraftRooms
            const existsCheck = await query(
                `SELECT 1 FROM draft_rooms WHERE league_id = $1 AND season_id = $2`,
                [league_id, season_id]
            );

            if (existsCheck.rowCount > 0 || activeDraftRooms.has(roomKey)) {
                console.log(`✅ 이미 draft_room 있음 또는 인스턴스 존재: league_id=${league_id}, season_id=${season_id}`);
                continue;
            }

            // draft_rooms 생성 트랜잭션
            await withTransaction(async (client) => {
                // maxRounds 조회
                const { rows: maxRoundRows } = await client.query(
                    `SELECT COALESCE(SUM(slot_count), 0) AS max_rounds
                    FROM league_season_roster_slot
                    WHERE league_id = $1 AND season_id = $2`,
                    [league_id, season_id]
                );
                const maxRounds = parseInt(maxRoundRows[0].max_rounds, 10);

                // draft_rooms 생성 (status should be 'waiting' or 'pending')
                const { rows: draft_rooms_db } = await client.query(
                    `INSERT INTO draft_rooms (
                        league_id,
                        season_id,
                        status,
                        total_slots,
                        timer_seconds,
                        started_at,
                        max_rounds,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, 'waiting', $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                `, [
                    league_id,
                    season_id,
                    max_teams,
                    draft_timer, // Use draft_timer from league_season_draft_master
                    draft_start_date,
                    maxRounds
                ]);

                const draft_room_id = draft_rooms_db[0]?.id;
                const io = getIO();

                // 📢 draftRoom 생성 알림 (broadcast) - This is for the UI to know a room is created
                io.to(`${league_id}_${season_id}`).emit('createDraftRoom', {
                    draft_room_id,
                    starts_at: draft_start_date,
                    message: '드래프트 룸이 성공적으로 생성되었습니다. 드래프트 시작 10분 전 알림을 기다려주세요.'
                });

                console.log(`🎯 draft_room DB에 생성됨 (waiting 상태): league_id=${league_id}, season_id=${season_id}, room_id=${draft_room_id}`);

                // --- Instantiate DraftRoom object and add to activeDraftRooms ---
                // We need the draft order here to fully initialize the DraftRoom instance
                const { rows: orderRows } = await client.query(
                    `SELECT
                        lst.user_id,
                        um.nickname,
                        lst.id AS team_id,
                        dt.draft_order,
                        dt.is_auto_draft,
                        lst.team_name,
                        lst.logo_url
                    FROM league_season_draft_teams dt
                    JOIN league_season_team lst
                        ON lst.id = dt.team_id
                        AND lst.league_id = dt.league_id
                        AND lst.season_id = dt.season_id
                    JOIN user_master um
                        ON um.user_id = lst.user_id
                    WHERE dt.league_id = $1
                    AND dt.season_id = $2
                    ORDER BY dt.draft_order;
                `, [league_id, season_id]);

                const draftRoomInstance = new DraftRoom({
                    leagueId: league_id,
                    seasonId: season_id,
                    draftRoomId: draft_room_id,
                    draftTimer: draft_timer,
                    draftOrder: orderRows,
                    maxRounds : maxRounds,
                    draftStatus : 'waiting',
                    // No need to set currentIndex, currentRound, playersPicked, remainingTime here
                    // as the draft hasn't started yet.
                });
                activeDraftRooms.set(roomKey, draftRoomInstance);
                console.log(`✅ DraftRoom 인스턴스 생성 및 activeDraftRooms에 추가됨: league_id=${league_id}, season_id=${season_id}`);


                // 1. 리그명 조회
                const { rows: leagueRows } = await client.query(
                    `SELECT league_name FROM league_master WHERE league_id = $1`,
                    [league_id]
                );
                const leagueName = leagueRows[0]?.league_name || '해당';

                // 2. 소속 유저 조회
                const { rows: users } = await client.query(
                    `SELECT user_id FROM league_season_team WHERE league_id = $1 AND season_id = $2`,
                    [league_id, season_id]
                );
                // 3. 알림 메시지 구성
                const formattedStart = dayjs(draft_start_date).format('YYYY-MM-DD HH:mm');
                const messageText = `${leagueName} 리그의 드래프트 룸이 생성되었습니다!\n이제 드래프트 룸에 입장할 수 있습니다. 시작 시간: ${formattedStart}`;
                const nowTimestamp = dayjs();

                // 4. bulk insert 알림 데이터 구성
                const insertValues = [];
                const insertParams = [];

                const url = "/league/draftroom?leagueId="+encodeURIComponent(encryptData(league_id))+"&seasonId="+encodeURIComponent(encryptData(season_id))

                users.forEach(({ user_id }, index) => {
                    const paramIndex = index * 8;
                    insertValues.push(`($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`);

                    insertParams.push(
                        user_id,
                        'draft',
                        '드래프트 룸 생성 알림',
                        messageText,
                        'unread',
                        url,
                        draft_room_id,
                        'draft_room',
                    );
                });

                // 5. 알림 저장 및 ID 반환
                const { rows: notiRows } = await client.query(
                    `INSERT INTO notifications (
                        user_id, type, title, message,
                        status, url, related_id, related_type
                    ) VALUES ${insertValues.join(',')}
                    RETURNING id
                `, insertParams);
                // 6. 유저별로 알림 ID 매칭 후 소켓 전송
                users.forEach(({ user_id }, idx) => {
                    const notiId = notiRows[idx]?.id;

                    io.to(`user_${user_id}`).emit('notification', {
                        type: 'draft',
                        title: '드래프트 룸 생성 알림',
                        message: messageText,
                        related_id: draft_room_id,
                        related_type: 'draft_room',
                        id: notiId,
                        url : url,
                        created_at: nowTimestamp.toISOString()
                    });
                });
            });
        }
    } catch (error) {
        console.error('드래프트 룸 생성 대상 조회/생성 중 에러:', error);
    }
});


// --- Existing alertJob (no significant changes needed here, still alerts 10 mins before) ---
// 매 초 0초마다 실행 (주의: 중복 알림 방지 로직 포함됨)
const alertJob = schedule.scheduleJob('0 * * * * *', async () => {
    console.log(`[${dayjs().format('YYYY.MM.DD HH:mm:ss')}] 드래프트 10분 전 알림 체크 중...`);

    const now = dayjs();
    const tenMinutesLater = now.add(10, 'minute');

    try {
        await withTransaction(async (client) => {
            const alertQuery = `
                SELECT dr.id AS draft_room_id, dr.league_id, dr.season_id, dr.started_at
                FROM draft_rooms dr
                WHERE dr.status = 'waiting'
                AND dr.ten_min_alert_sent = false
                AND dr.started_at BETWEEN NOW() AND $1
            `;
            const { rows } = await client.query(alertQuery, [tenMinutesLater.toDate()]);
            console.log('🔍 알림 대상 draft_rooms:', rows.length, "tenMinutesLater", tenMinutesLater.format());

            for (const row of rows) {
                const { league_id, season_id, draft_room_id, started_at } = row;
                const io = getIO();

                // 1. 리그명 조회
                const { rows: leagueRows } = await client.query(
                    `SELECT league_name FROM league_master WHERE league_id = $1`,
                    [league_id]
                );
                const leagueName = leagueRows[0]?.league_name || '해당';

                // 2. 소속 유저 조회
                const { rows: users } = await client.query(
                    `SELECT user_id FROM league_season_team WHERE league_id = $1 AND season_id = $2`,
                    [league_id, season_id]
                );

                const formattedStart = dayjs(started_at).format('YYYY-MM-DD HH:mm');
                const messageText = `${leagueName} 리그의 드래프트가 10분 후에 시작됩니다!\n 드래프트에 입장해주세요.`;
                const nowTimestamp = dayjs();

                // 3. 알림 저장 (bulk insert + RETURNING id)
                const insertValues = [];
                const insertParams = [];

                const url = "/league/draftroom?leagueId="+encodeURIComponent(encryptData(league_id))+"&seasonId="+encodeURIComponent(encryptData(season_id));

                users.forEach(({ user_id }, index) => {
                    const paramIndex = index * 8;
                    insertValues.push(`($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`);
                    insertParams.push(
                        user_id,
                        'draft',
                        '드래프트 10분 전 알림',
                        messageText,
                        'unread',
                        url,
                        draft_room_id,
                        'draft_room',
                    );
                });

                const { rows: notiRows } = await client.query(
                    `INSERT INTO notifications (
                        user_id, type, title, message,
                        status, url, related_id, related_type
                    ) VALUES ${insertValues.join(',')}
                    RETURNING id
                `, insertParams);
                // 4. 유저별 개별 소켓 알림 전송
                users.forEach(({ user_id }, idx) => {
                    const notiId = notiRows[idx]?.id;

                    io.to(`user_${user_id}`).emit('notification', {
                        type: 'draft',
                        title: '드래프트 10분 전 알림',
                        message: messageText,
                        related_id: draft_room_id,
                        related_type: 'draft_room',
                        id: notiId,
                        url : url,
                        created_at: nowTimestamp.toISOString()
                    });
                });

                // 5. 알림 전송 완료 표시
                await client.query(
                    `UPDATE draft_rooms
                    SET ten_min_alert_sent = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [draft_room_id]);
                // 6. 방송용 알림 emit (전체 방송)
                io.to(`${league_id}_${season_id}`).emit('draftAlert', {
                    type: 'draftSoon',
                    data: {
                        draft_room_id,
                        starts_at: started_at,
                        message: '드래프트 시작까지 10분 남았습니다. 준비하세요!'
                    }
                });

                console.log(`⏰ 드래프트 10분 전 알림 전송 완료: league_id=${league_id}, season_id=${season_id}`);
            }
        });
    } catch (error) {
        console.error('❌ 10분 전 알림 처리 중 에러:', error);
    }
});

// --- Modified 'startDraftJob' for calling startTimer() ---
const startDraftJob = schedule.scheduleJob('* * * * * *', async () => {
    const now = dayjs();

    try {
        const { rows: readyRooms } = await query(
            `SELECT dr.id AS draft_room_id, dr.league_id, dr.season_id, dr.timer_seconds, dr.max_rounds
            FROM draft_rooms dr
            WHERE dr.status = 'waiting'
            AND dr.started_at <= NOW()`
        );

        for (const room of readyRooms) {
            const roomKey = `${room.league_id}_${room.season_id}`;
            const draftRoomInstance = activeDraftRooms.get(roomKey);

            if (!draftRoomInstance) {
                console.warn(`⚠️ DraftRoom 인스턴스를 찾을 수 없음. 복원 로직을 확인하세요. league_id=${room.league_id}, season_id=${room.season_id}`);
                continue;
            }

            // Call startTimer() on the existing instance
            if(draftRoomInstance.getStatus() === "waiting"){
                try {
                    await withTransaction(async client=>{
                        // 5. 알림 전송 완료 표시
                        await client.query(
                            `UPDATE draft_rooms
                            SET status = 'running', updated_at = CURRENT_TIMESTAMP
                            WHERE id = $1
                        `, [room.draft_room_id]);

                        draftRoomInstance.startTimer();
                        console.log(`🚀 DraftRoom 타이머 시작됨: league_id=${room.league_id}, season_id=${room.season_id}`, draftRoomInstance.getStatus());
                    })
                } catch (error) {
                    
                }
            }
        }
    } catch (error) {
        console.error('❌ DraftRoom 타이머 시작 중 에러:', error);
    }
});

async function restoreRunningDraftRooms() {
    console.log('🔁 서버 재시작 감지. 진행 중인 드래프트 복원 시도 중...');

    try {
        const { rows: runningRooms } = await query(`
            SELECT 
                dr.id AS draft_room_id,
                dr.league_id,
                dr.season_id,
                dr.timer_seconds,
                dr.current_pick_order,
                dr.round,
                dr.current_timer_seconds,
                dr.max_rounds
            FROM draft_rooms dr
            WHERE dr.status = 'running'
        `);

        for (const room of runningRooms) {
            const roomKey = `${room.league_id}_${room.season_id}`;
            if (activeDraftRooms.has(roomKey)) continue;

            // 드래프트 순서 복원
            const { rows: orderRows } = await query(`
                SELECT 
                    lst.user_id,
                    um.nickname,
                    lst.id AS team_id,
                    dt.draft_order,
                    dt.is_auto_draft,
                    lst.team_name,
                    lst.logo_url
                FROM league_season_draft_teams dt
                JOIN league_season_team lst
                    ON lst.id = dt.team_id
                    AND lst.league_id = dt.league_id
                    AND lst.season_id = dt.season_id
                JOIN user_master um
                    ON um.user_id = lst.user_id
                WHERE dt.league_id = $1
                AND dt.season_id = $2
                ORDER BY dt.draft_order;
            `, [room.league_id, room.season_id]);

            // 픽된 선수들 복원
            const { rows: pickRows } = await query(`
                SELECT team_id, player_id
                FROM draft_results
                WHERE draft_room_id = $1
            `, [room.draft_room_id]);

            const playersPicked = {};
            for (const row of pickRows) {
                if (!playersPicked[row.team_id]) playersPicked[row.team_id] = [];
                playersPicked[row.team_id].push({ player_id: row.player_id });
            }

            const totalTeams = orderRows.length;
            const totalPicksMade = room.current_pick_order || 1;
            const currentIndex = (totalPicksMade - 1) % totalTeams;
            const currentRound = room.round || Math.floor((totalPicksMade - 1) / totalTeams) + 1;

            const draftRoomInstance = new DraftRoom({
                leagueId: room.league_id,
                seasonId: room.season_id,
                draftRoomId: room.draft_room_id,
                draftTimer: room.timer_seconds,
                draftOrder: orderRows,
                currentIndex,
                currentRound,
                playersPicked,
                remainingTime: room.current_timer_seconds || room.timer_seconds,
                maxRounds : room.max_rounds
            });

            activeDraftRooms.set(roomKey, draftRoomInstance);

            draftRoomInstance.startTimer();
            console.log(`✅ DraftRoom 복원됨: league_id=${room.league_id}, season_id=${room.season_id}`);
        }
    } catch (error) {
        console.error('❌ DraftRoom 복원 중 에러:', error);
    }
}

(async () => {
    await restoreRunningDraftRooms();
})();
