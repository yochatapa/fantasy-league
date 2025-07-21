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
        maxRounds = null
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

        this.init();
    }

    async init() {
        await this.loadPositionLimits();
        await this.loadPickedPlayersDetails();
        await this.updateDraftRoomState();
        this.broadcastUpdate();
        this.startTimer();
    }

    async updateDraftRoomState() {
        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[UPDATE] maxRounds 초과 상태, draft_rooms 업데이트 스킵');
            return;
        }

        const currentUser = this.draftOrder[this.currentIndex];

        await withTransaction(async (client) => {
            await client.query(`
                UPDATE draft_rooms
                SET round = $1,
                    current_pick_order = $2,
                    current_user_id = $3,
                    timer_seconds = $4,
                    current_timer_seconds = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
            `, [
                this.currentRound,
                this.currentIndex + 1,
                currentUser.user_id,
                this.draftTimer,
                this.remainingTime,
                this.draftRoomId
            ]);
        });
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
        for (const [teamId, picks] of Object.entries(this.playersPicked)) {
            const detailedPicks = [];
            for (const pick of picks) {
                const { rows } = await query(`
                    SELECT name, primary_position FROM kbo_player_master WHERE id = $1
                `, [pick.player_id]);
                if (rows.length > 0) {
                    detailedPicks.push({
                        player_id: pick.player_id,
                        name: rows[0].name,
                        position: rows[0].primary_position
                    });
                }
            }
            this.playersPicked[teamId] = detailedPicks;
        }
    }

    startTimer() {
        this.clearTimer();
        if (this.timer) return;

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

            try {
                await this.updateDraftRoomState();
                this.broadcastUpdate();
            } catch (err) {
                console.error('❌ Timer loop error:', err);
            }

            if (this.remainingTime <= 0) {
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
        this.currentIndex++;
        if (this.currentIndex >= this.draftOrder.length) {
            this.currentIndex = 0;
            this.currentRound++;
        }

        console.log(`[NEXT TURN] round=${this.currentRound}, index=${this.currentIndex}`);

        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[NEXT TURN] maxRounds 초과, 드래프트 종료');
            this.clearTimer();
            await this.finish();
            return;
        }

        this.remainingTime = this.draftTimer;
        await this.updateDraftRoomState();
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

            const candidates = await query(`
                SELECT 
                    p.id AS player_id,
                    p.name,
                    p.primary_position,
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
                WHERE s.season_year = $1
                AND p.id NOT IN (${pickedIds.length > 0 ? pickedIds.join(',') : 'NULL'})
                ORDER BY ops DESC
                LIMIT 50
            `, [dayjs().year() - 1]);

            let finalPick = candidates.rows.find(player => {
                const count = (this.playersPicked[teamId] || []).filter(p => p.position === player.primary_position).length;
                const limit = this.positionLimits?.[player.primary_position] ?? Infinity;
                return count < limit;
            }) || candidates.rows[0];

            if (!finalPick) {
                const fallback = await query(`
                    SELECT id AS player_id, name, primary_position
                    FROM kbo_player_master
                    WHERE id NOT IN (
                        SELECT player_id FROM draft_results WHERE draft_room_id = $1
                    )
                    ORDER BY id ASC LIMIT 1
                `, [this.draftRoomId]);
                finalPick = fallback.rows[0];
                if (!finalPick) {
                    console.error('[AUTO PICK] No player to pick');
                    this._isAutoPicking = false;
                    await this.nextTurn();
                    return;
                }
            }

            await this.savePick({
                userId: currentUser.user_id,
                teamId,
                playerId: finalPick.player_id,
                isAuto: true
            });

            this.playersPicked[teamId] = [...(this.playersPicked[teamId] || []), {
                player_id: finalPick.player_id,
                name: finalPick.name,
                position: finalPick.primary_position
            }];

            this.broadcastUpdate();
            await this.nextTurn();
        } catch (err) {
            console.error('❌ autoPick error:', err);
            await this.nextTurn();
        } finally {
            this._isAutoPicking = false;
        }
    }

    async pickPlayer({ teamId, player }) {
        const { rows } = await query(`
            SELECT name, primary_position FROM kbo_player_master WHERE id = $1
        `, [player.player_id]);
        const playerInfo = rows[0];

        this.playersPicked[teamId] = [...(this.playersPicked[teamId] || []), {
            player_id: player.player_id,
            name: playerInfo.name,
            position: playerInfo.primary_position
        }];

        const currentUser = this.draftOrder[this.currentIndex];

        await this.savePick({
            userId: currentUser.user_id,
            teamId,
            playerId: player.player_id,
            isAuto: false
        });

        this.broadcastUpdate();
        await this.nextTurn();
    }

    async savePick({ userId, teamId, playerId, isAuto }) {
        await withTransaction(async (client) => {
            await client.query(`
                INSERT INTO draft_results (
                    draft_room_id, round, pick_order, user_id,
                    team_id, player_id, picked_at, is_auto_pick
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
            `, [
                this.draftRoomId,
                this.currentRound,
                this.currentIndex,
                userId,
                teamId,
                playerId,
                isAuto
            ]);
        });
    }

    broadcastUpdate() {
        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[BROADCAST] maxRounds 초과 상태, broadcast 생략');
            return;
        }

        const currentUser = this.draftOrder[this.currentIndex];
        console.log(`[BROADCAST] round=${this.currentRound}, maxRound=${this.maxRounds} index=${this.currentIndex}, user=${currentUser.nickname}`);

        this.io.to(`${this.leagueId}-${this.seasonId}`).emit('draft:update', {
            currentUser: currentUser.nickname,
            currentIndex: this.currentIndex,
            currentRound: this.currentRound,
            remainingTime: this.remainingTime,
            draftResults: this.playersPicked,
            draftStatus: 'running',
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
        console.log(`[DRAFT FINISHED] leagueId=${this.leagueId}, seasonId=${this.seasonId}`);

        await withTransaction(async (client) => {
            await client.query(`
                UPDATE draft_rooms
                SET status = 'finished', finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [this.draftRoomId]);
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
}
