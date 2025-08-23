import express from 'express';
import { verifyToken, verifyCommissioner, verifyTeams}  from '../middleware/auth.js'
import { createLeague, getLeagueInfo, getLeagueList, getSeasonInfo, checkInviteCode, joinLeague, setDraftOrder, pickPlayer, getMatchList, getRankings, getRosterTransactionHistory, getCurrentSeasonInfo, getCurrentMyTeamInfo } from '../controllers/leagues/leaguesController.js';
import { getDraftRoomInfo } from '../controllers/leagues/draftContoller.js';

const router = express.Router();

// GET
router.get('/:leagueId/info', verifyToken, verifyTeams, getLeagueInfo);
router.get('/:leagueId/current-season-info', verifyToken, verifyTeams, getCurrentSeasonInfo);
router.get('/:leagueId/current-my-team-info', verifyToken, verifyTeams, getCurrentMyTeamInfo);
router.get('/:leagueId/season/:seasonId/draftroom/info', verifyToken, verifyTeams, getDraftRoomInfo);
router.get('/:leagueId/season/:seasonId/info', verifyToken, verifyTeams, getSeasonInfo);
router.get('/:leagueId/season/:seasonId/matches', verifyToken, verifyTeams, getMatchList); 
router.get('/:leagueId/season/:seasonId/transactions', verifyToken, verifyTeams, getRosterTransactionHistory);
router.get('/:leagueId/season/:seasonId/rankings', verifyToken, verifyTeams, getRankings); 
router.get('/list', verifyToken, getLeagueList);

// POST
router.post('/:leagueId/season/:seasonId/draft-order', verifyToken, verifyTeams, setDraftOrder);
router.post('/:leagueId/season/:seasonId/draftroom/pick', verifyToken, verifyTeams, pickPlayer);
router.post('/create', verifyToken, createLeague);
router.post('/check-invite-code', verifyToken, checkInviteCode);
router.post('/join', verifyToken, joinLeague);

export default router;