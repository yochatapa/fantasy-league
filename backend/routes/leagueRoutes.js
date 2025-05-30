import express from 'express';
import { verifyToken, verifyCommissioner, verifyTeams}  from '../middleware/auth.js'
import { createLeague, getLeagueInfo, getLeagueList, getSeasonInfo, checkInviteCode, joinLeague } from '../controllers/leagues/leaguesController.js';

const router = express.Router();

//GET
router.get('/info', verifyToken, verifyTeams, getLeagueInfo);
router.get('/season/info', verifyToken, verifyTeams, getSeasonInfo);
router.get('/list', verifyToken, getLeagueList);

// POST
router.post('/create', verifyToken, createLeague);
router.post('/check-invite-code', verifyToken, checkInviteCode);
router.post('/join', verifyToken, joinLeague);

export default router;