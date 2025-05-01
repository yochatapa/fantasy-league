import express from 'express';
import { getKboTeamList, createKboTeam, updateKboTeam, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import handleUpload from '../middleware/upload.js';

const router = express.Router();

router.post('/team/create', handleUpload([{name : "logo"}]), createKboTeam);
router.put('/team/update/:teamId', handleUpload([{name : "logo"}]), updateKboTeam);
router.get('/team/list', getKboTeamList);
router.get('/team/:teamId', getKboTeamDetail);

export default router;