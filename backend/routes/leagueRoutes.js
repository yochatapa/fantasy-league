import express from 'express';
import verifyToken  from '../middleware/auth.js'
import { createLeague, getLeagueInfo } from '../controllers/leagues/leaguesController.js';

const router = express.Router();

router.post('/create', verifyToken, createLeague);
router.get('/info', verifyToken, getLeagueInfo);

export default router;