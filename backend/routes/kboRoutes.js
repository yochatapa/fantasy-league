import express from 'express';
import { verifyToken }  from '../middleware/auth.js'
import { getKboTeamList, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import { getKboPlayerList, getKboPlayerDetail } from '../controllers/admin/kboPlayerManagementController.js';

const router = express.Router();

router.get('/team/list', getKboTeamList);
router.get('/team/:teamId', getKboTeamDetail);

router.get('/player/list', getKboPlayerList);
router.get('/player/:playerId', getKboPlayerDetail);
export default router;