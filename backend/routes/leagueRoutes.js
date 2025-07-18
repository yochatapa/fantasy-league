import express from 'express';
import { verifyToken, verifyCommissioner, verifyTeams}  from '../middleware/auth.js'
import { createLeague, getLeagueInfo, getLeagueList, getSeasonInfo, checkInviteCode, joinLeague, setDraftOrder, pickPlayer } from '../controllers/leagues/leaguesController.js';
import { getDraftRoomInfo } from '../controllers/leagues/draftContoller.js';

const router = express.Router();

//GET
router.get('/:leagueId/info', verifyToken, verifyTeams, getLeagueInfo);
router.get('/:leagueId/season/:seasonId/draftroom/info', verifyToken, verifyTeams, getDraftRoomInfo)
router.get('/:leagueId/season/:seasonId/info', verifyToken, verifyTeams, getSeasonInfo);
router.get('/list', verifyToken, getLeagueList);

// POST
router.post('/:leagueId/season/:seasonId/draft-order', verifyToken, verifyTeams, setDraftOrder);
router.post('/:leagueId/season/:seasonId/draftroom/pick', verifyToken, verifyTeams, pickPlayer)
router.post('/create', verifyToken, createLeague);
router.post('/check-invite-code', verifyToken, checkInviteCode);
router.post('/join', verifyToken, joinLeague);

export default router;