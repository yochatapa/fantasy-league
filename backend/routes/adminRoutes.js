import express from 'express';
import { verifyToken, verifyAdmin}  from '../middleware/auth.js'
import { getKboTeamList, createKboTeam, updateKboTeam, deleteKboTeam, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import { createKboPlayer } from '../controllers/admin/kboPlayerManagementController.js';
import handleUpload from '../middleware/upload.js';

const router = express.Router();

router.post('/team/create', verifyToken, verifyAdmin, handleUpload([{name : "newFiles"}]), createKboTeam);
router.put('/team/update/:teamId', verifyToken, verifyAdmin, handleUpload([{name : "newFiles"}]), updateKboTeam);
router.delete('/team/delete', verifyToken, verifyAdmin, deleteKboTeam);
router.get('/team/list', verifyToken, verifyAdmin, getKboTeamList);
router.get('/team/:teamId', verifyToken, verifyAdmin, getKboTeamDetail);


router.post('/player/create', verifyToken, verifyAdmin, /*handleUpload([{name : "newFiles"}]),*/ createKboPlayer);
// router.put('/player/update/:playerId', verifyToken, verifyAdmin, /*handleUpload([{name : "newFiles"}]),*/ updateKboTeam);
// router.delete('/player/delete', verifyToken, verifyAdmin, deleteKboTeam);
export default router;