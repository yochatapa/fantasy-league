import express from 'express';
import { getKboTeamList, createKboTeam, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import handleUpload from '../middleware/upload.js';

const router = express.Router();

router.post('/team/create', handleUpload([{name : "logo"}]), createKboTeam);
router.get('/team/list', getKboTeamList);
router.get('/team/:teamId', getKboTeamDetail);

export default router;