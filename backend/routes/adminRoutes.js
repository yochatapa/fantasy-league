import express from 'express';
import { getKboTeamList } from '../controllers/admin/kboTeamManagementController.js';

const router = express.Router();

router.get('/team/list', getKboTeamList);

export default router;