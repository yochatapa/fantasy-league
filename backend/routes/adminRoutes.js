import express from 'express';
import { verifyToken, verifyAdmin}  from '../middleware/auth.js'
import { getKboTeamList, createKboTeam, updateKboTeam, deleteKboTeam, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import { getKboPlayerList, createKboPlayer, getKboPlayerDetail, updateKboPlayer, deleteKboPlayer } from '../controllers/admin/kboPlayerManagementController.js';
import handleUpload from '../middleware/upload.js';
import { createKboGame, getKboGameList } from '../controllers/admin/kboGameManagementController.js';

const router = express.Router();

router.post('/team/create', verifyToken, verifyAdmin, handleUpload(), createKboTeam);
router.put('/team/update/:teamId', verifyToken, verifyAdmin, handleUpload(), updateKboTeam);
router.delete('/team/delete', verifyToken, verifyAdmin, deleteKboTeam);
router.get('/team/list', verifyToken, verifyAdmin, getKboTeamList);
router.get('/team/:teamId', verifyToken, verifyAdmin, getKboTeamDetail);



router.get('/player/list', verifyToken, verifyAdmin, getKboPlayerList);
router.get('/player/:playerId', verifyToken, verifyAdmin, getKboPlayerDetail);
router.post('/player/create', verifyToken, verifyAdmin, handleUpload(), createKboPlayer);
router.put('/player/update/:playerId', verifyToken, verifyAdmin, handleUpload(), updateKboPlayer);
router.delete('/player/delete', verifyToken, verifyAdmin, deleteKboPlayer);

router.get('/game/list', verifyToken, verifyAdmin, getKboGameList);
router.post('/game/create', verifyToken, verifyAdmin, createKboGame);
export default router;