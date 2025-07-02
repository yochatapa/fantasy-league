import express from 'express';
import { verifyToken }  from '../middleware/auth.js'
import { getKboTeamList, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import { getKboPlayerList, getKboPlayerDetail } from '../controllers/admin/kboPlayerManagementController.js';
import { getTopBatters, getTopPitchers } from '../controllers/kbo/playerStatsController.js';
import { getKboGameSchedules } from '../controllers/kbo/kboGameController.js';
import { getKboCurrentBatterStats, getKboCurrentInfo, getKboGameCompletedInfo, getKboGameDetail, getKboGameInningStats } from '../controllers/admin/kboGameManagementController.js';
import { getTeamRosterDetail } from '../controllers/admin/kboRosterManagementController.js';

const router = express.Router();

router.get('/team/list', getKboTeamList);
router.get('/team/:teamId', getKboTeamDetail);

router.get('/top/:limit/batter', getTopBatters);
router.get('/top/:limit/pitcher', getTopPitchers);

router.get('/games/schedule/:date', getKboGameSchedules);
router.get('/game/inning-info/:gameId', getKboGameInningStats);
router.get('/game/current-info/:gameId', getKboCurrentInfo);
router.get('/game/:gameId/completed-info', getKboGameCompletedInfo);
router.get('/game/:gameId/batter/:playerId/current-stats', getKboCurrentBatterStats);
router.get('/roster/:teamId', getTeamRosterDetail);
router.get('/game/:gameId', getKboGameDetail);

router.get('/player/list', getKboPlayerList);
router.get('/player/:playerId', getKboPlayerDetail);
export default router;