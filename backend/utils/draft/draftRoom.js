import dayjs from 'dayjs';
import { query, withTransaction } from '../../db.js';
import { getIO } from '../socket.js';

// Global constants for position slot prioritization and specificity.
// These should ideally be loaded from a config or database if they are dynamic.
// Ensure these match your actual league_season_roster_slot and fantasy rules.

// Maps a player's original position to the fantasy roster slots they can fill.
const positionSlotPriorities = {
    'C': ['C', 'UTIL', 'BENCH'],
    '1B': ['1B', 'IF', 'UTIL', 'BENCH'],
    '2B': ['2B', 'IF', 'UTIL', 'BENCH'],
    '3B': ['3B', 'IF', 'UTIL', 'BENCH'],
    'SS': ['SS', 'IF', 'UTIL', 'BENCH'],
    'LF': ['LF', 'OF', 'UTIL', 'BENCH'],
    'CF': ['CF', 'OF', 'UTIL', 'BENCH'],
    'RF': ['RF', 'OF', 'UTIL', 'BENCH'],
    'SP': ['SP', 'P', 'BENCH'],
    'RP': ['RP', 'P', 'BENCH'],
    'DH': ['DH', 'UTIL', 'BENCH'],
    'P': ['P', 'BENCH'],
    'IF': ['IF', 'UTIL', 'BENCH'],
    'OF': ['OF', 'UTIL', 'BENCH'],
    'UTIL': ['UTIL', 'BENCH'],
    'BENCH': ['BENCH']
};

// Defines the order of specificity for roster slots. More specific slots come first.
// This is used to prioritize filling critical positions.
const SLOTS_BY_SPECIFICITY_GLOBAL = [
    'C', 'SS', // Most specific and critical infield positions
    'SP', 'RP', // Pitcher specific
    '1B', '2B', '3B', // Infielders
    'LF', 'CF', 'RF', // Outfielders
    'DH', // Designated Hitter
    'P', 'IF', 'OF', 'UTIL', 'BENCH' // More general or flexible slots
];

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
        this.positionLimits = {}; // Will be loaded from DB
        this._isAutoPicking = false;
        this.draftStatus = draftStatus;
        this.draftType = draftType;
        this.lastDbUpdate = dayjs();
        this.dbUpdateInterval = 5; // DB update interval in seconds
        this.seasonYear = null; // Season year for player stats and positions
        this.rosterSlotConfig = {}; // Will be loaded from DB

        this.init();
    }

    async init() {
        await this.loadSeasonYear(); // Load season year first
        await this.loadPositionLimits(); // Load league-specific position limits
        await this.loadRosterSlotConfig(); // Load league-specific roster slots
        await this.loadPickedPlayersDetails();
        // Initial DB state update
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
                this.seasonYear = dayjs().year(); // Default to current year if not found
            }
        } catch (error) {
            console.error('Failed to load season year:', error);
            this.seasonYear = dayjs().year(); // Fallback in case of error
        }
    }

    /**
     * Loads the roster slot configuration for the current league and season.
     */
    async loadRosterSlotConfig() {
        try {
            const slotConfigQueryResult = await query(`
                SELECT position, slot_count
                FROM league_season_roster_slot
                WHERE league_id = $1 AND season_id = $2 AND position NOT IN ('IL','NA')
            `, [this.leagueId, this.seasonId]);

            this.rosterSlotConfig = {}; // Reset before filling
            slotConfigQueryResult.rows.forEach(row => {
                this.rosterSlotConfig[row.position] = Number(row.slot_count);
            });
            console.log(`[INFO] Loaded roster slot config:`, this.rosterSlotConfig);
        } catch (error) {
            console.error('Failed to load roster slot configuration:', error);
            // Default or error handling if crucial config is not found
            this.rosterSlotConfig = {}; // Ensure it's an empty object if load fails
        }
    }

    /**
     * Updates the draft room state in the database.
     * @param {boolean} forceUpdate - If true, updates immediately regardless of dbUpdateInterval.
     */
    async updateDraftRoomState(forceUpdate = false) {
        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[UPDATE] maxRounds exceeded, skipping draft_rooms update.');
            return;
        }

        // Only update DB if forceUpdate is true, or enough time has passed.
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
                    currentUser?.user_id || null, // Optional chaining for currentUser
                    this.draftTimer,
                    this.remainingTime,
                    this.draftStatus,
                    this.draftRoomId,
                ]);
            });
            this.lastDbUpdate = dayjs(); // Update last DB update time
        } catch (error) {
            console.error('Failed to update draft room state in database:', error);
            // Add retry logic or more robust error handling as needed
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

        // Initialize playersPicked and populate with data from DB
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
                round: row.round // Include round information
            });
        }
    }

    startTimer() {
        this.clearTimer();
        if (this.timer) return;

        if(this.draftStatus === "waiting") this.draftStatus = "running";

        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[TIMER] maxRounds exceeded, not starting timer.');
            return;
        }

        this.timer = setInterval(async () => {
            if (this.maxRounds && this.currentRound > this.maxRounds) {
                console.log('[TIMER] maxRounds detected, stopping timer.');
                this.clearTimer();
                return;
            }

            this.remainingTime -= 1;
            this.remainingTime = Math.max(0,this.remainingTime);

            try {
                // Update DB state less frequently (controlled by updateDraftRoomState logic).
                await this.updateDraftRoomState();
                // Always broadcast to clients every second.
                this.broadcastUpdate();
            } catch (err) {
                console.error('❌ Timer loop error:', err);
            }

            const currentUser = this.draftOrder[this.currentIndex];

            // Auto-pick logic remains the same.
            // If the current user is not connected AND 3 seconds (or less) remain, auto-pick.
            // OR if the timer runs out, auto-pick.
            const isCurrentUserConnected = this.getConnectedUsers().findIndex(cu => Number(cu.userId) === Number(currentUser?.user_id)) >= 0;
            const shouldAutoPickDueToDisconnection = !isCurrentUserConnected && this.remainingTime <= Math.max(0, this.draftTimer - 3);

            if (shouldAutoPickDueToDisconnection || this.remainingTime <= 0) {
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
            console.log('[NEXT TURN] Auction draft is not handled by nextTurn.');
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
            console.log('[NEXT TURN] maxRounds exceeded, ending draft.');
            this.clearTimer();
            await this.finish();
            return;
        }

        this.remainingTime = this.draftTimer;
        // Force update DB immediately when turn changes.
        await this.updateDraftRoomState(true);
        this.startTimer();
    }

    async autoPick() {
        if (this._isAutoPicking) return;
        this._isAutoPicking = true;

        const currentUser = this.draftOrder[this.currentIndex];
        const teamId = currentUser.team_id;

        try {
            // Get already picked player IDs for this draft room
            const picked = await query(`
                SELECT player_id FROM draft_results WHERE draft_room_id = $1
            `, [this.draftRoomId]);
            const pickedIds = picked.rows.map(r => r.player_id);

            // Ensure seasonYear is loaded before querying
            if (this.seasonYear === null) {
                await this.loadSeasonYear();
            }

            // Fetch players with their actual positions and OPS from kbo_player_season
            // Increased LIMIT to consider a wider pool of candidates
            const candidates = await query(`
                SELECT
                    p.id AS player_id,
                    p.name,
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
                JOIN batter_season_stats s ON p.id = s.player_id AND s.season_year = $1
                JOIN kbo_player_season kps ON kps.player_id = p.id AND kps.year = $1
                WHERE p.id NOT IN (${pickedIds.length > 0 ? pickedIds.join(',') : 'NULL'})
                GROUP BY p.id, p.name, s.hits, s.walks, s.hit_by_pitch, s.at_bats, s.sacrifice_flies, s.singles, s.doubles, s.triples, s.home_runs
                ORDER BY ops DESC
                LIMIT 100 -- Consider top 100 OPS players
            `, [this.seasonYear]);

            // Ensure rosterSlotConfig is loaded (should be in init, but as a fallback)
            if (Object.keys(this.rosterSlotConfig).length === 0) {
                await this.loadRosterSlotConfig();
            }

            // Calculate current team's roster slot usage (temporary assignment simulation)
            const currentTeamRoster = this.playersPicked[teamId] || [];
            const tempSlotUsage = {};
            for (const pos in this.rosterSlotConfig) {
                 tempSlotUsage[pos] = 0;
            }

            const assignedPlayerIds = new Set();
            const specificSlotsSorted = SLOTS_BY_SPECIFICITY_GLOBAL.filter(s => this.rosterSlotConfig[s] > 0 && s !== 'BENCH' && s !== 'UTIL');
            const flexibleSlotsSorted = ['UTIL', 'BENCH'].filter(s => this.rosterSlotConfig[s] > 0);

            // 1. Initial assignment (greedy) for specific slots
            for (const slotType of specificSlotsSorted) {
                let remaining = this.rosterSlotConfig[slotType] - (tempSlotUsage[slotType] || 0);
                for (const player of currentTeamRoster) {
                    if (assignedPlayerIds.has(player.player_id)) continue;

                    const playerOriginalPositions = player.position.split(',').map(p => p.trim());
                    if (playerOriginalPositions.some(p => (positionSlotPriorities[p] || []).includes(slotType))) {
                        if (remaining > 0) {
                            tempSlotUsage[slotType]++;
                            assignedPlayerIds.add(player.player_id);
                            remaining--;
                        }
                    }
                }
            }

            // 2. Assign remaining players to utility/bench slots
            for (const slotType of flexibleSlotsSorted) {
                let remaining = this.rosterSlotConfig[slotType] - (tempSlotUsage[slotType] || 0);
                for (const player of currentTeamRoster) {
                    if (assignedPlayerIds.has(player.player_id)) continue;
                    if (remaining > 0) {
                        tempSlotUsage[slotType] = (tempSlotUsage[slotType] || 0) + 1;
                        assignedPlayerIds.add(player.player_id);
                        remaining--;
                    }
                }
            }
            // `tempSlotUsage` now reflects the current team's assumed roster state.

            let bestScore = -1;
            let bestPick = null;

            for (const candidate of candidates.rows) {
                const playerOriginalPositions = candidate.player_original_positions.split(',').map(pos => pos.trim());
                let currentScore = 0;

                let canFillAnyEmptySpecificSlot = false; // Can this player fill any specific (non-bench/util) empty slot?

                for (const slotType of SLOTS_BY_SPECIFICITY_GLOBAL) {
                    const maxCount = this.rosterSlotConfig[slotType] || 0;
                    const currentCount = tempSlotUsage[slotType] || 0;
                    const remainingSlots = maxCount - currentCount;

                    if (remainingSlots > 0) { // If there's an available slot of this type
                        const canPlayerFillSlot = playerOriginalPositions.some(p =>
                            (positionSlotPriorities[p] || []).includes(slotType)
                        );

                        if (canPlayerFillSlot) {
                            if (slotType !== 'BENCH' && slotType !== 'UTIL') {
                                canFillAnyEmptySpecificSlot = true;
                            }

                            // Prioritize more specific slots and empty slots
                            const specificityIndex = SLOTS_BY_SPECIFICITY_GLOBAL.indexOf(slotType);
                            // Higher score for more specific slots (smaller index)
                            const slotWeight = (SLOTS_BY_SPECIFICITY_GLOBAL.length - specificityIndex) * 100;

                            // Significant bonus for filling an *empty* slot
                            const emptyBonus = remainingSlots > 0 ? 500 : 0;

                            currentScore += (slotWeight + emptyBonus);
                        }
                    }
                }

                // Add OPS score, scaled appropriately
                currentScore += (candidate.ops * 100); // OPS 1.0 adds 100 points

                // Apply a penalty if the player cannot fill any specific empty slot
                // This pushes players who only fit into BENCH/UTIL slots lower on the priority list early on
                if (!canFillAnyEmptySpecificSlot && (this.rosterSlotConfig['BENCH'] > (tempSlotUsage['BENCH'] || 0) || this.rosterSlotConfig['UTIL'] > (tempSlotUsage['UTIL'] || 0))) {
                     currentScore -= 1000; // Large penalty
                }


                if (currentScore > bestScore) {
                    bestScore = currentScore;
                    bestPick = candidate;
                }
            }

            let finalPick = bestPick;

            // Fallback: If no suitable player found with good score, or all specific slots filled,
            // fall back to the highest OPS player from the candidates.
            if (!finalPick || bestScore < -500) { // Adjust score threshold as needed
                console.log('[AUTO PICK] No optimal position player found or score too low, falling back to highest OPS player.');
                finalPick = candidates.rows[0];
            }

            // Final fallback: If even the first candidate is null (shouldn't happen if DB has players)
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
                `, [this.draftRoomId, this.seasonYear]);
                finalPick = fallback.rows[0];
                if (!finalPick) {
                    console.error('[AUTO PICK] No player available to pick.');
                    this._isAutoPicking = false;
                    await this.nextTurn();
                    return;
                }
            }

            // Save the chosen player
            await this.savePick({
                userId: currentUser.user_id,
                teamId,
                playerId: finalPick.player_id,
                playerOriginalPositions: finalPick.player_original_positions,
                isAuto: true,
                round: this.currentRound
            });

            // Add the picked player to the in-memory playersPicked object
            this.playersPicked[teamId] = [...(this.playersPicked[teamId] || []), {
                player_id: finalPick.player_id,
                name: finalPick.name,
                position: finalPick.player_original_positions,
                round: this.currentRound
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
            JOIN kbo_player_season kps ON kps.player_id = kpm.id AND kps.year = $2
            WHERE kpm.id = $1
            GROUP BY kpm.name;
        `, [player.player_id, this.seasonYear]);
        const playerInfo = rows[0];

        if (!playerInfo) {
            console.error(`Player ID ${player.player_id} not found.`);
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

    async savePick({ userId, teamId, playerId, playerOriginalPositions, isAuto, round }) {
        await withTransaction(async (client) => {
            await client.query(`
                INSERT INTO draft_results (
                    draft_room_id, round, pick_order, user_id,
                    team_id, player_id, picked_at, is_auto_pick,
                    player_original_positions
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)
            `, [
                this.draftRoomId,
                round,
                this.currentIndex,
                userId,
                teamId,
                playerId,
                isAuto,
                playerOriginalPositions
            ]);
        });
    }

    broadcastUpdate() {
        if (this.maxRounds && this.currentRound > this.maxRounds) {
            console.log('[BROADCAST] maxRounds exceeded, skipping broadcast.');
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
        console.log(`[DRAFT FINISH] leagueId=${this.leagueId}, seasonId=${this.seasonId}`);

        await withTransaction(async (client) => {
            // 1. Update draft room status
            await client.query(`
                UPDATE draft_rooms
                SET status = 'finished', finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [this.draftRoomId]);

            await client.query(`
                UPDATE league_season_draft_master
                SET draft_end_date = CURRENT_TIMESTAMP
                WHERE league_id = $1 AND season_id = $2
            `, [this.leagueId, this.seasonId]);

            // 2. Load roster slot information (if not already loaded)
            // Ensure this.rosterSlotConfig is fully populated
            if (Object.keys(this.rosterSlotConfig).length === 0) {
                await this.loadRosterSlotConfig();
            }

            // 3. Define position slot priorities and specificity order
            // These are now global constants defined at the top of the file.

            // 4. Insert data into team_rosters and roster_transaction_history based on draft results
            if (this.playersPicked && Object.keys(this.playersPicked).length > 0) {
                let totalPlayersProcessed = 0;

                for (const teamIdStr of Object.keys(this.playersPicked)) {
                    const teamId = parseInt(teamIdStr);
                    const playersInTeam = this.playersPicked[teamIdStr]; // Array of players for this team

                    // Initialize slot usage for the current team
                    const currentTeamSlotUsage = {};
                    for (const pos in this.rosterSlotConfig) {
                        currentTeamSlotUsage[pos] = 0;
                    }

                    const playerToAssignedSlot = new Map(); // Map<player_id, assignedSlotType>
                    const slotTypeToAssignedPlayers = new Map(); // Map<slotType, Set<player_id>>
                    for (const slotType of SLOTS_BY_SPECIFICITY_GLOBAL) {
                        slotTypeToAssignedPlayers.set(slotType, new Set());
                    }

                    // ---------------------------------------------------
                    // 4-1. Initial Assignment Phase (Greedy)
                    // ---------------------------------------------------
                    const unassignedPlayers = new Set(playersInTeam.map(p => p.player_id));

                    // Attempt to fill specific slots first (excluding BENCH, UTIL)
                    const specificSlots = SLOTS_BY_SPECIFICITY_GLOBAL.filter(s => s !== 'BENCH' && s !== 'UTIL' && this.rosterSlotConfig[s] > 0);
                    for (const targetSlot of specificSlots) {
                        let remainingSlotCount = this.rosterSlotConfig[targetSlot] - (currentTeamSlotUsage[targetSlot] || 0);
                        if (remainingSlotCount <= 0) continue;

                        const candidates = playersInTeam.filter(p =>
                            unassignedPlayers.has(p.player_id) &&
                            p.position.split(',').map(pos => pos.trim()).some(origPos =>
                                (positionSlotPriorities[origPos] || []).includes(targetSlot)
                            )
                        );

                        // Assign players to specific slots
                        for (const player of candidates) {
                            if (remainingSlotCount <= 0) break;
                            playerToAssignedSlot.set(player.player_id, targetSlot);
                            slotTypeToAssignedPlayers.get(targetSlot).add(player.player_id);
                            currentTeamSlotUsage[targetSlot]++;
                            unassignedPlayers.delete(player.player_id);
                            remainingSlotCount--;
                        }
                    }

                    // Assign remaining players to UTIL or BENCH slots
                    for (const player of playersInTeam) {
                        if (unassignedPlayers.has(player.player_id)) {
                            let assignedToFlexibleSlot = false;
                            if (this.rosterSlotConfig['UTIL'] > (currentTeamSlotUsage['UTIL'] || 0)) {
                                playerToAssignedSlot.set(player.player_id, 'UTIL');
                                slotTypeToAssignedPlayers.get('UTIL').add(player.player_id);
                                currentTeamSlotUsage['UTIL'] = (currentTeamSlotUsage['UTIL'] || 0) + 1;
                                unassignedPlayers.delete(player.player_id);
                                assignedToFlexibleSlot = true;
                            } else if (this.rosterSlotConfig['BENCH'] > (currentTeamSlotUsage['BENCH'] || 0)) {
                                playerToAssignedSlot.set(player.player_id, 'BENCH');
                                slotTypeToAssignedPlayers.get('BENCH').add(player.player_id);
                                currentTeamSlotUsage['BENCH'] = (currentTeamSlotUsage['BENCH'] || 0) + 1;
                                unassignedPlayers.delete(player.player_id);
                                assignedToFlexibleSlot = true;
                            }

                            if (!assignedToFlexibleSlot) {
                                // Fallback if all slots (even BENCH) are somehow full.
                                // This should ideally not happen if roster size matches draft picks.
                                playerToAssignedSlot.set(player.player_id, 'BENCH'); // Force assign to BENCH
                                if (!slotTypeToAssignedPlayers.has('BENCH')) slotTypeToAssignedPlayers.set('BENCH', new Set());
                                slotTypeToAssignedPlayers.get('BENCH').add(player.player_id);
                                currentTeamSlotUsage['BENCH'] = (currentTeamSlotUsage['BENCH'] || 0) + 1; // Increment anyway
                                unassignedPlayers.delete(player.player_id);
                                console.warn(`[DRAFT FINISH] Team ${teamId} - Player ${player.name} (ID: ${player.player_id}) could not be assigned to any slot during initial pass, forcing BENCH assignment.`);
                            }
                        }
                    }

                    // ---------------------------------------------------
                    // 4-2. Optimization Phase (Iterative Swapping)
                    // ---------------------------------------------------
                    const MAX_SWAP_ITERATIONS = 10;
                    let swappedThisIteration = true;

                    for (let iter = 0; iter < MAX_SWAP_ITERATIONS && swappedThisIteration; iter++) {
                        swappedThisIteration = false;

                        // Find currently empty specific slots (excluding flexible ones)
                        const emptySpecificSlots = SLOTS_BY_SPECIFICITY_GLOBAL.filter(slotType =>
                            slotType !== 'BENCH' && slotType !== 'UTIL' && this.rosterSlotConfig[slotType] > 0 &&
                            (currentTeamSlotUsage[slotType] || 0) < this.rosterSlotConfig[slotType]
                        );

                        for (const emptySlotType of emptySpecificSlots) {
                            // Look for a player in a less specific slot (UTIL, BENCH, IF, OF, P)
                            // who can fill the `emptySlotType`.
                            const flexibleSlotTypesForSwap = ['UTIL', 'BENCH', 'IF', 'OF', 'P'].filter(s => this.rosterSlotConfig[s] > 0);
                            let foundPlayerToSwap = null;
                            let playerOldSlotType = null;

                            for (const flexSlotType of flexibleSlotTypesForSwap) {
                                if (!slotTypeToAssignedPlayers.has(flexSlotType)) continue;

                                for (const playerIdInFlexSlot of slotTypeToAssignedPlayers.get(flexSlotType)) {
                                    const player = playersInTeam.find(p => p.player_id === playerIdInFlexSlot);
                                    if (!player) continue;

                                    // Check if this player can play the empty specific slot
                                    const canPlayEmptySlot = player.position.split(',').map(pos => pos.trim()).some(origPos =>
                                        (positionSlotPriorities[origPos] || []).includes(emptySlotType)
                                    );

                                    if (canPlayEmptySlot) {
                                        foundPlayerToSwap = player;
                                        playerOldSlotType = flexSlotType;
                                        break;
                                    }
                                }
                                if (foundPlayerToSwap) break;
                            }

                            if (foundPlayerToSwap) {
                                const playerId = foundPlayerToSwap.player_id;

                                // Perform the swap
                                slotTypeToAssignedPlayers.get(playerOldSlotType).delete(playerId);
                                currentTeamSlotUsage[playerOldSlotType]--;

                                playerToAssignedSlot.set(playerId, emptySlotType);
                                slotTypeToAssignedPlayers.get(emptySlotType).add(playerId);
                                currentTeamSlotUsage[emptySlotType]++;

                                swappedThisIteration = true;
                                // Reset iteration to ensure all possible swaps are considered
                                // (a swap might open up new opportunities)
                                iter = -1; // Force restart the outer loop
                                break; // Exit inner loop for emptySpecificSlots
                            }
                        }
                    }

                    // ---------------------------------------------------
                    // 4-3. Save Final Assigned Slots to DB
                    // ---------------------------------------------------
                    for (const player of playersInTeam) {
                        const assignedSlot = playerToAssignedSlot.get(player.player_id);
                        if (!assignedSlot) {
                            console.error(`[ERROR] Player ${player.name} (ID: ${player.player_id}) has no assigned slot after all processes for team ${teamId}.`);
                            continue;
                        }

                        const { player_id, name, position, round } = player;

                        await client.query(`
                            INSERT INTO league_season_team_rosters (league_id, season_id, team_id, player_id, roster_slot_position, acquired_at)
                            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                            ON CONFLICT (league_id, season_id, team_id, player_id) DO UPDATE
                            SET roster_slot_position = $5, acquired_at = CURRENT_TIMESTAMP, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
                        `, [this.leagueId, this.seasonId, teamId, player_id, assignedSlot]);

                        await client.query(`
                            INSERT INTO league_season_roster_transaction_history (league_id, season_id, team_id, player_id, transaction_type, transaction_date, details)
                            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
                        `, [
                            this.leagueId,
                            this.seasonId,
                            teamId,
                            player_id,
                            'drafted',
                            `Draft Round: ${round || 'N/A'}, Assigned Slot: ${assignedSlot}, Player Original Positions: ${position}, Player Name: ${name}`
                        ]);
                        totalPlayersProcessed++;
                    }
                }
                console.log(`[DRAFT FINISH] leagueId=${this.leagueId}, seasonId=${this.seasonId}: ${totalPlayersProcessed} players' rosters and transaction history recorded.`);
            } else {
                console.warn(`[DRAFT FINISH] leagueId=${this.leagueId}, seasonId=${this.seasonId}: No draft results found, skipping roster and history recording.`);
            }
        });

        this.io.to(`${this.leagueId}-${this.seasonId}`).emit('draft:end', {
            message: 'Draft has ended.',
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