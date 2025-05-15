import express from 'express';
import { verifyToken, verifyAdmin}  from '../middleware/auth.js'
import { getKboTeamList, createKboTeam, updateKboTeam, deleteKboTeam, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import { getKboPlayerList, createKboPlayer, getKboPlayerDetail, updateKboPlayer, deleteKboPlayer } from '../controllers/admin/kboPlayerManagementController.js';
import handleUpload from '../middleware/upload.js';
import { createKboGame, createKboGameRoster, deleteKboGame, getKboGameDetail, getKboGameList, updateKboGameStatus } from '../controllers/admin/kboGameManagementController.js';
import { createTeamRoster, deactiveTeamRoster, deleteTeamRoster, getTeamRosterDetail, getTeamRosterList } from '../controllers/admin/kboRosterManagementController.js';

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
router.delete('/game/delete', verifyToken, verifyAdmin, deleteKboGame);
router.get('/game/:gameId',verifyToken, verifyAdmin, getKboGameDetail);
router.put('/game/status/update', verifyToken, verifyAdmin, updateKboGameStatus)

router.post('/game/roster/create', verifyToken, verifyAdmin, createKboGameRoster);

router.get('/roster/list', verifyToken, verifyAdmin, getTeamRosterList);
router.get('/roster/:teamId', verifyToken, verifyAdmin, getTeamRosterDetail);
router.post('/roster/create', verifyToken, verifyAdmin, createTeamRoster);
router.delete('/roster/delete', verifyToken, verifyAdmin, deleteTeamRoster);
router.put('/roster/deactive', verifyToken, verifyAdmin, deactiveTeamRoster);
export default router;