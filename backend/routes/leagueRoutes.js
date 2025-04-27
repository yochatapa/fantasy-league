import express from 'express';
import verifyToken  from '../middleware/auth.js'
import { createLeague, getLeagueInfo, getLeagueList } from '../controllers/leagues/leaguesController.js';

const router = express.Router();

router.post('/create', verifyToken, createLeague);
router.get('/info', verifyToken, getLeagueInfo);
router.get('/list', verifyToken, getLeagueList);

export default router;