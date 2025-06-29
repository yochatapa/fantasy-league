import express from 'express';
import { verifyToken }  from '../middleware/auth.js'
import { getKboTeamList, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import { getKboPlayerList, getKboPlayerDetail } from '../controllers/admin/kboPlayerManagementController.js';
import { getTopBatters, getTopPitchers } from '../controllers/kbo/playerStatsController.js';

const router = express.Router();

router.get('/team/list', getKboTeamList);
router.get('/team/:teamId', getKboTeamDetail);

router.get('/top/:limit/batter', getTopBatters)
router.get('/top/:limit/pitcher', getTopPitchers)

router.get('/player/list', getKboPlayerList);
router.get('/player/:playerId', getKboPlayerDetail);
export default router;