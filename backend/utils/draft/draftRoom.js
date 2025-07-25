import dayjs from 'dayjs';
import { query, withTransaction } from '../../db.js';
import { getIO } from '../socket.js';

export default class DraftRoom {
    constructor({
        leagueId,
        seasonId,
        draftRoomId,
        draftTimer,
        draftOrder,
        currentRound = 1,
        currentIndex = 0,
        playersPicked = {},
        remainingTime = null,
        maxRounds = null,
        draftStatus = 'waiting',
        draftType = 'snake'
    }) {
        this.leagueId = leagueId;
        this.seasonId = seasonId;
        this.draftRoomId = draftRoomId;
        this.draftTimer = draftTimer;
        this.draftOrder = draftOrder;
        this.currentIndex = currentIndex;
        this.currentRound = currentRound;
        this.totalRounds = draftOrder.length;
        this.maxRounds = maxRounds;
        this.timer = null;
        this.remainingTime = remainingTime ?? draftTimer;
        this.io = getIO();
        this.playersPicked = playersPicked;
        this.positionLimits = {};
        this._isAutoPicking = false;
        this.draftStatus = draftStatus;
        this.draftType = draftType;
        // 새로 추가: 마지막 DB 업데이트 시간과 업데이트 간격
        this.lastDbUpdate = dayjs();
        this.dbUpdateInterval = 5; // DB 업데이트 간격 (초 단위)
        this.seasonYear = null; // Add seasonYear property

        this.init();
    }

    async init() {
        await this.loadSeasonYear(); // Load season year first
        await this.loadPositionLimits();
        await this.loadPickedPlayersDetails();
        // 초기 로드 시 DB 상태를 한 번 업데이트합니다.
        await this.updateDraftRoomState(true);
    }

    /**
     * Loads the season_year for the current league and season.
     */
    async loadSeasonYear() {
        try {
            const { rows } = await query(`
                SELECT season_year
                FROM league_season
                WHERE league_id = $1 AND season_id = $2
            `, [this.leagueId, this.seasonId]);

            if (rows.length > 0) {
                this.seasonYear = rows[0].season_year;
            } else {
                console.warn(`[WARNING] No season_year found for leagueId: ${this.leagueId}, seasonId: ${this.seasonId}`);
                // Fallback or error handling if season_year is crucial and not found
                this.seasonYear = dayjs().year(); // Default to current year if not found
            }
        } catch (error) {
            console.error('Failed to load season year:', error);
            this.seasonYear = dayjs().year(); // Fallback in case of error
        }
    }

    /**
     * 드래프트 룸 상태를 데이터베이스에 업데이트합니다.
     * @param {boolean} forceUpdate - true인 경우, dbUpdateInterval과 관계없이 즉시 업데이트합니다.
     */
    async updateDraftRoomState(forceUpdate = false) {
        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[UPDATE] maxRounds 초과 상태, draft_rooms 업데이트 스킵');
            return;
        }

        // forceUpdate가 true이거나, 충분한 시간이 경과했을 때만 DB를 업데이트합니다.
        if (!forceUpdate && dayjs().diff(this.lastDbUpdate, 'second') < this.dbUpdateInterval) {
            return;
        }

        const currentUser = this.draftOrder[this.currentIndex];

        try {
            await withTransaction(async (client) => {
                await client.query(`
                    UPDATE draft_rooms
                    SET round = $1,
                        current_pick_order = $2,
                        current_user_id = $3,
                        timer_seconds = $4,
                        current_timer_seconds = $5,
                        status = $6,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $7
                `, [
                    this.currentRound,
                    this.currentIndex + 1,
                    currentUser?.user_id || null, // currentUser가 없을 경우를 대비한 옵셔널 체이닝
                    this.draftTimer,
                    this.remainingTime,
                    this.draftStatus,
                    this.draftRoomId,
                ]);
            });
            this.lastDbUpdate = dayjs(); // 마지막 DB 업데이트 시간 갱신
        } catch (error) {
            console.error('데이터베이스의 드래프트 룸 상태 업데이트 실패:', error);
            // 필요에 따라 오류 처리 로직 추가 (예: 재시도)
        }
    }

    async loadPositionLimits() {
        const { rows } = await query(`
            SELECT stat, stat_value
            FROM league_season_stat_setting
            WHERE league_id = $1 AND season_id = $2
        `, [this.leagueId, this.seasonId]);

        for (const row of rows) {
            this.positionLimits[row.stat] = Number(row.stat_value);
        }
    }

    async loadPickedPlayersDetails() {
        const pickedPlayersFromDb = await query(`
            SELECT
                dr.player_id,
                dr.team_id,
                dr.round,
                kpm.name,
                dr.player_original_positions AS position
            FROM
                draft_results dr
            INNER JOIN
                draft_rooms drm ON dr.draft_room_id = drm.id
            INNER JOIN
                league_season ls ON drm.league_id = ls.league_id AND drm.season_id = ls.season_id
            INNER JOIN
                kbo_player_master kpm ON dr.player_id = kpm.id
            WHERE
                dr.draft_room_id = $1
            ORDER BY
                dr.round, dr.pick_order;
        `, [this.draftRoomId]);

        // playersPicked 객체를 초기화하고 DB에서 가져온 데이터로 채웁니다.
        this.playersPicked = {};
        for (const row of pickedPlayersFromDb.rows) {
            const teamId = row.team_id;
            if (!this.playersPicked[teamId]) {
                this.playersPicked[teamId] = [];
            }
            this.playersPicked[teamId].push({
                player_id: row.player_id,
                name: row.name,
                position: row.position,
                round: row.round // round 정보 추가
            });
        }
    }

    startTimer() {
        this.clearTimer();
        if (this.timer) return;

        if(this.draftStatus === "waiting") this.draftStatus = "running";

        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[TIMER] maxRounds 초과로 타이머 시작 안함');
            return;
        }

        this.timer = setInterval(async () => {
            if (this.maxRounds && this.currentRound > this.maxRounds) {
                console.log('[TIMER] maxRounds 초과 감지, 타이머 종료');
                this.clearTimer();
                return;
            }

            this.remainingTime -= 1;
            this.remainingTime = Math.max(0,this.remainingTime);

            try {
                // DB 상태를 덜 자주 업데이트합니다 (updateDraftRoomState 내부 로직에 따름).
                await this.updateDraftRoomState();
                // 클라이언트에게는 항상 매 초마다 브로드캐스트합니다.
                this.broadcastUpdate();
            } catch (err) {
                console.error('❌ 타이머 루프 오류:', err);
            }

            const currentUser = this.draftOrder[this.currentIndex];

            // 자동 선택 로직은 동일하게 유지됩니다.
            if(this.remainingTime <= Math.max(0,this.draftTimer - 3) && this.getConnectedUsers().findIndex(cu => Number(cu.userId) === Number(currentUser?.user_id)) < 0){
                await this.autoPick();
            } else if (this.remainingTime <= 0) {
                await this.autoPick();
            }
        }, 1000);
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async nextTurn() {
        const totalUsers = this.draftOrder.length;

        if (this.draftType === 'auction') {
            console.log('[NEXT TURN] 옥션 드래프트는 nextTurn에서 처리하지 않습니다.');
            return;
        }

        if (this.draftType === 'snake') {
            const isEvenRound = this.currentRound % 2 === 0;

            if (isEvenRound) {
                this.currentIndex--;
                if (this.currentIndex < 0) {
                    this.currentIndex = 0;
                    this.currentRound++;
                }
            } else {
                this.currentIndex++;
                if (this.currentIndex >= totalUsers) {
                    this.currentIndex = totalUsers - 1;
                    this.currentRound++;
                }
            }
        } else if (this.draftType === 'linear') {
            this.currentIndex++;
            if (this.currentIndex >= totalUsers) {
                this.currentIndex = 0;
                this.currentRound++;
            }
        }

        console.log(`[NEXT TURN] round=${this.currentRound}, index=${this.currentIndex}, type=${this.draftType}`);

        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[NEXT TURN] maxRounds 초과, 드래프트 종료');
            this.clearTimer();
            await this.finish();
            return;
        }

        this.remainingTime = this.draftTimer;
        // 턴 변경 시에는 즉시 DB에 반영되어야 하므로 forceUpdate를 true로 호출합니다.
        await this.updateDraftRoomState(true);
        this.startTimer();
    }

    async autoPick() {
        if (this._isAutoPicking) return;
        this._isAutoPicking = true;

        const currentUser = this.draftOrder[this.currentIndex];
        const teamId = currentUser.team_id;

        try {
            const picked = await query(`
                SELECT player_id FROM draft_results WHERE draft_room_id = $1
            `, [this.draftRoomId]);
            const pickedIds = picked.rows.map(r => r.player_id);

            // Ensure seasonYear is loaded before querying
            if (this.seasonYear === null) {
                await this.loadSeasonYear();
            }

            // Fetch players with their actual positions from kbo_player_season
            const candidates = await query(`
                SELECT
                    p.id AS player_id,
                    p.name,
                    -- Use STRING_AGG to get all positions for the player
                    STRING_AGG(DISTINCT kps.position, ', ') AS player_original_positions,
                    (
                        COALESCE(s.hits, 0) + COALESCE(s.walks, 0) + COALESCE(s.hit_by_pitch, 0)
                    )::float / NULLIF(
                        COALESCE(s.at_bats, 0) + COALESCE(s.walks, 0) + COALESCE(s.hit_by_pitch, 0) + COALESCE(s.sacrifice_flies, 0),
                        0
                    )
                    +
                    (
                        COALESCE(s.singles, 0)
                        + 2 * COALESCE(s.doubles, 0)
                        + 3 * COALESCE(s.triples, 0)
                        + 4 * COALESCE(s.home_runs, 0)
                    )::float / NULLIF(COALESCE(s.at_bats, 0), 0) AS ops
                FROM kbo_player_master p
                JOIN batter_season_stats s ON p.id = s.player_id
                JOIN kbo_player_season kps ON kps.player_id = p.id AND kps.year = $1 -- Use this.seasonYear
                WHERE s.season_year = $1 -- Use this.seasonYear
                AND p.id NOT IN (${pickedIds.length > 0 ? pickedIds.join(',') : 'NULL'})
                GROUP BY p.id, p.name, s.hits, s.walks, s.hit_by_pitch, s.at_bats, s.sacrifice_flies, s.singles, s.doubles, s.triples, s.home_runs
                ORDER BY ops DESC
                LIMIT 50
            `, [this.seasonYear]); // Pass this.seasonYear

            let finalPick = candidates.rows.find(player => {
                const playerPositions = player.player_original_positions.split(',').map(pos => pos.trim());
                for (const p of playerPositions) {
                    const count = (this.playersPicked[teamId] || []).filter(pp => pp.position.split(',').map(pos => pos.trim()).includes(p)).length;
                    const limit = this.positionLimits?.[p] ?? Infinity;
                    if (count < limit) {
                        return true;
                    }
                }
                return false;
            }) || candidates.rows[0];

            if (!finalPick) {
                const fallback = await query(`
                    SELECT p.id AS player_id, name, STRING_AGG(DISTINCT kps.position, ', ') AS player_original_positions
                    FROM kbo_player_master p
                    JOIN kbo_player_season kps ON kps.player_id = p.id AND kps.year = $2
                    WHERE p.id NOT IN (
                        SELECT player_id FROM draft_results WHERE draft_room_id = $1
                    )
                    GROUP BY p.id, p.name
                    ORDER BY p.id ASC LIMIT 1
                `, [this.draftRoomId, this.seasonYear]); // Pass this.seasonYear
                finalPick = fallback.rows[0];
                if (!finalPick) {
                    console.error('[AUTO PICK] 선택할 선수 없음');
                    this._isAutoPicking = false;
                    await this.nextTurn();
                    return;
                }
            }

            await this.savePick({
                userId: currentUser.user_id,
                teamId,
                playerId: finalPick.player_id,
                playerOriginalPositions: finalPick.player_original_positions,
                isAuto: true,
                round: this.currentRound
            });

            this.playersPicked[teamId] = [...(this.playersPicked[teamId] || []), {
                player_id: finalPick.player_id,
                name: finalPick.name,
                position: finalPick.player_original_positions,
                round: this.currentRound
            }];

            this.broadcastUpdate();
            await this.nextTurn();
        } catch (err) {
            console.error('❌ autoPick 오류:', err);
            await this.nextTurn();
        } finally {
            this._isAutoPicking = false;
        }
    }

    async pickPlayer({ teamId, player }) {
        // Ensure seasonYear is loaded before querying
        if (this.seasonYear === null) {
            await this.loadSeasonYear();
        }

        // Fetch player info, including all original positions
        const { rows } = await query(`
            SELECT
                kpm.name,
                STRING_AGG(DISTINCT kps.position, ', ') AS player_original_positions
            FROM kbo_player_master kpm
            JOIN kbo_player_season kps ON kps.player_id = kpm.id AND kps.year = $2 -- Use this.seasonYear
            WHERE kpm.id = $1
            GROUP BY kpm.name;
        `, [player.player_id, this.seasonYear]); // Pass this.seasonYear
        const playerInfo = rows[0];

        if (!playerInfo) {
            console.error(`선수 ID ${player.player_id}를 찾을 수 없습니다.`);
            return;
        }

        this.playersPicked[teamId] = [...(this.playersPicked[teamId] || []), {
            player_id: player.player_id,
            name: playerInfo.name,
            position: playerInfo.player_original_positions,
            round: this.currentRound
        }];

        const currentUser = this.draftOrder[this.currentIndex];

        await this.savePick({
            userId: currentUser.user_id,
            teamId,
            playerId: player.player_id,
            playerOriginalPositions: playerInfo.player_original_positions,
            isAuto: false,
            round: this.currentRound
        });

        this.broadcastUpdate();
        await this.nextTurn();
    }

    async savePick({ userId, teamId, playerId, playerOriginalPositions, isAuto, round }) { // round 및 playerOriginalPositions 매개변수 추가
        await withTransaction(async (client) => {
            await client.query(`
                INSERT INTO draft_results (
                    draft_room_id, round, pick_order, user_id,
                    team_id, player_id, picked_at, is_auto_pick,
                    player_original_positions -- 새로운 컬럼 추가
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)
            `, [
                this.draftRoomId,
                round, // 전달받은 round 값 사용
                this.currentIndex,
                userId,
                teamId,
                playerId,
                isAuto,
                playerOriginalPositions // player_original_positions 컬럼에 값 전달
            ]);
        });
    }

    broadcastUpdate() {
        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[BROADCAST] maxRounds 초과 상태, 브로드캐스트 생략');
            return;
        }

        const currentUser = this.draftOrder[this.currentIndex];
        console.log(`[BROADCAST] remainingTime=${this.remainingTime} round=${this.currentRound}, maxRound=${this.maxRounds} index=${this.currentIndex}, user=${currentUser?.nickname}`);

        this.io.to(`${this.leagueId}-${this.seasonId}`).emit('draft:update', {
            currentUser: currentUser?.nickname,
            currentIndex: this.currentIndex,
            currentRound: this.currentRound,
            remainingTime: this.remainingTime,
            draftResults: this.playersPicked,
            draftStatus: this.draftStatus,
            connectedUsers: this.getConnectedUsers(),
        });
    }

    isTeamTurn(teamId) {
        const currentTurnUser = this.draftOrder[this.currentIndex];
        return currentTurnUser?.team_id === teamId;
    }

    isPlayerPicked(playerId) {
        for (const picks of Object.values(this.playersPicked)) {
            if (picks.some(p => p.player_id === playerId)) {
                return true;
            }
        }
        return false;
    }

    async finish() {
        this.clearTimer();
        console.log(`[DRAFT 종료] leagueId=${this.leagueId}, seasonId=${this.seasonId}`);

        await withTransaction(async (client) => {
            // 1. 드래프트 룸 상태 업데이트
            await client.query(`
                UPDATE draft_rooms
                SET status = 'finished', finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [this.draftRoomId]);

            // 2. 로스터 슬롯 정보 불러오기
            // 각 리그/시즌별 로스터 슬롯 정의를 가져옵니다.
            const slotConfigQuery = await client.query(`
                SELECT position, slot_count
                FROM public.league_season_roster_slot
                WHERE league_id = $1 AND season_id = $2
            `, [this.leagueId, this.seasonId]);

            const rosterSlotConfig = {}; // { '1B': 1, '2B': 1, ..., 'BENCH': 5 } 형태
            slotConfigQuery.rows.forEach(row => {
                rosterSlotConfig[row.position] = Number(row.slot_count);
            });

            // 3. 로스터 슬롯 할당 우선순위 정의 (하드코딩 또는 DB에서 관리 가능)
            // 선수의 원래 포지션과 매칭될 수 있는 슬롯 포지션의 우선순위를 정의합니다.
            // 예를 들어, 'RF' 선수는 'RF' -> 'OF' -> 'UTIL' -> 'BENCH' 순으로 할당됩니다.
            const positionSlotPriorities = {
                '1B': ['1B', 'IF', 'UTIL', 'BENCH'],
                '2B': ['2B', 'IF', 'UTIL', 'BENCH'],
                '3B': ['3B', 'IF', 'UTIL', 'BENCH'],
                'SS': ['SS', 'IF', 'UTIL', 'BENCH'],
                'LF': ['LF', 'OF', 'UTIL', 'BENCH'],
                'CF': ['CF', 'OF', 'UTIL', 'BENCH'],
                'RF': ['RF', 'OF', 'UTIL', 'BENCH'],
                'C': ['C', 'UTIL', 'BENCH'], // 포수는 C 슬롯이 따로 있을 경우
                'SP': ['SP', 'P', 'BENCH'],
                'RP': ['RP', 'P', 'BENCH'],
                // Add any other positions as needed, including general ones like 'IF', 'OF', 'P', 'UTIL'
                'DH': ['DH', 'UTIL', 'BENCH'], // Designated Hitter
                'P': ['P', 'BENCH'], // Generic Pitcher
                'IF': ['IF', 'UTIL', 'BENCH'], // Generic Infielder
                'OF': ['OF', 'UTIL', 'BENCH'], // Generic Outfielder
                'UTIL': ['UTIL', 'BENCH'], // Utility
                'BENCH': ['BENCH'] // Bench
            };

            // 팀별 현재 슬롯 사용 현황을 추적할 객체 (각 팀마다 초기화)
            const teamSlotUsage = {}; // { teamId: { '1B': 0, '2B': 0, ..., 'BENCH': 0 } } 형태

            // 4. 드래프트 결과에 따라 team_rosters 및 roster_transaction_history에 데이터 삽입
            if (this.playersPicked && Object.keys(this.playersPicked).length > 0) {
                let totalPlayersProcessed = 0;

                for (const teamIdStr of Object.keys(this.playersPicked)) {
                    const teamId = parseInt(teamIdStr);
                    const playersInTeam = this.playersPicked[teamIdStr]; // 해당 팀의 선수 배열

                    // 각 팀별 슬롯 사용 현황 초기화
                    teamSlotUsage[teamId] = {};
                    for (const pos in rosterSlotConfig) {
                        teamSlotUsage[teamId][pos] = 0;
                    }

                    // Sort players by round and then by pick_order (implicitly by their order in the array)
                    // The `loadPickedPlayersDetails` already orders them, so we can rely on that order.
                    playersInTeam.sort((a, b) => a.round - b.round);

                    for (const player of playersInTeam) {
                        const { player_id, name, position, round } = player; // Player's original positions (e.g., "1B,DH")

                        let assignedSlot = 'BENCH'; // Default to BENCH if no specific slot found

                        const playerOriginalPositions = position.split(',').map(p => p.trim());

                        let foundSlot = false;
                        for (const originalPos of playerOriginalPositions) {
                            const possibleSlots = positionSlotPriorities[originalPos] || ['UTIL', 'BENCH'];

                            for (const slotCandidate of possibleSlots) {
                                if (rosterSlotConfig[slotCandidate] !== undefined &&
                                    teamSlotUsage[teamId][slotCandidate] < rosterSlotConfig[slotCandidate]) {
                                    assignedSlot = slotCandidate;
                                    teamSlotUsage[teamId][slotCandidate]++;
                                    foundSlot = true;
                                    break;
                                }
                            }
                            if (foundSlot) break; // If a slot was found for any of the original positions, stop
                        }

                        // If no specific slot was found, try assigning to UTIL or BENCH
                        if (!foundSlot) {
                            const generalSlots = ['UTIL', 'BENCH'];
                            for (const slotCandidate of generalSlots) {
                                if (rosterSlotConfig[slotCandidate] !== undefined &&
                                    teamSlotUsage[teamId][slotCandidate] < rosterSlotConfig[slotCandidate]) {
                                    assignedSlot = slotCandidate;
                                    teamSlotUsage[teamId][slotCandidate]++;
                                    break;
                                }
                            }
                        }

                        // league_season_team_rosters 테이블에 선수 추가
                        await client.query(`
                            INSERT INTO public.league_season_team_rosters (league_id, season_id, team_id, player_id, roster_slot_position, acquired_at)
                            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                            ON CONFLICT (league_id, season_id, team_id, player_id) DO UPDATE
                            SET roster_slot_position = $5, acquired_at = CURRENT_TIMESTAMP, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                        `, [this.leagueId, this.seasonId, teamId, player_id, assignedSlot]);

                        // league_season_roster_transaction_history 테이블에 이력 기록
                        await client.query(`
                            INSERT INTO public.league_season_roster_transaction_history (league_id, season_id, team_id, player_id, transaction_type, transaction_date, details)
                            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
                        `, [
                            this.leagueId,
                            this.seasonId,
                            teamId,
                            player_id,
                            'drafted', // 트랜잭션 타입
                            `드래프트 라운드: ${round || 'N/A'}, 할당 슬롯: ${assignedSlot}, 선수 포지션: ${position}, 선수명: ${name}` // 상세 정보
                        ]);
                        totalPlayersProcessed++;
                    }
                }
                console.log(`[DRAFT 종료] leagueId=${this.leagueId}, seasonId=${this.seasonId}: ${totalPlayersProcessed}명의 선수 로스터 및 이력 기록 완료.`);
            } else {
                console.warn(`[DRAFT 종료] leagueId=${this.leagueId}, seasonId=${this.seasonId}: 드래프트 결과가 없어 로스터 및 이력 기록을 건너킵니다.`);
            }
        });

        this.io.to(`${this.leagueId}-${this.seasonId}`).emit('draft:end', {
            message: '드래프트가 종료되었습니다.',
        });
    }

    getConnectedUsers() {
        const roomKey = `${this.leagueId}-${this.seasonId}`;
        const room = this.io.sockets.adapter.rooms.get(roomKey);
        const users = [];

        if (!room) return users;

        for (const socketId of room) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                users.push({
                    socketId: socket.id,
                    userId: socket.userId,
                    leagueId: socket.leagueId,
                    seasonId: socket.seasonId
                });
            }
        }

        return users;
    }

    getStatus(){
        return this.draftStatus;
    }
}