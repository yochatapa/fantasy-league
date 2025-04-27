import express from 'express';
import verifyToken  from '../middleware/auth.js'
import { createLeague } from '../controllers/leagues/leaguesController.js';

const router = express.Router();

router.post('/create', verifyToken, createLeague);

export default router;