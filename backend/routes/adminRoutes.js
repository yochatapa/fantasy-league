import express from 'express';
import { verifyToken, verifyAdmin}  from '../middleware/auth.js'
import { getKboTeamList, createKboTeam, updateKboTeam, deleteKboTeam, getKboTeamDetail } from '../controllers/admin/kboTeamManagementController.js';
import { getKboPlayerList, createKboPlayer, getKboPlayerDetail, updateKboPlayer, deleteKboPlayer } from '../controllers/admin/kboPlayerManagementController.js';
import handleUpload from '../middleware/upload.js';
import { getKboCurrentInfo, createKboCurrentInfo, createKboGame, createKboGameRoster, deleteKboGame, deleteKboGameRoster, getKboGameDetail, getKboGameList, updateKboGameStatus, createBatterGameStats, createPitcherGameStats, getKboCurrentBatterStats, updateKboGameStats, getKboGameCompletedInfo, updateKboGameScore } from '../controllers/admin/kboGameManagementController.js';
import { createTeamRoster, deactiveTeamRoster, deleteTeamRoster, getTeamRosterDetail, getTeamRosterList } from '../controllers/admin/kboRosterManagementController.js';

const router = express.Router();

// 팀 관리
router.post('/team/create', verifyToken, verifyAdmin, handleUpload(), createKboTeam);
router.put('/team/update/:teamId', verifyToken, verifyAdmin, handleUpload(), updateKboTeam);
router.delete('/team/delete', verifyToken, verifyAdmin, deleteKboTeam);
router.get('/team/list', verifyToken, verifyAdmin, getKboTeamList);
router.get('/team/:teamId', verifyToken, verifyAdmin, getKboTeamDetail);

// 선수 관리
router.get('/player/list', verifyToken, verifyAdmin, getKboPlayerList);
router.get('/player/:playerId', verifyToken, verifyAdmin, getKboPlayerDetail);
router.post('/player/create', verifyToken, verifyAdmin, handleUpload(), createKboPlayer);
router.put('/player/update/:playerId', verifyToken, verifyAdmin, handleUpload(), updateKboPlayer);
router.delete('/player/delete', verifyToken, verifyAdmin, deleteKboPlayer);

// 게임 관리
router.get('/game/list', verifyToken, verifyAdmin, getKboGameList);
router.post('/game/create', verifyToken, verifyAdmin, createKboGame);
router.delete('/game/delete', verifyToken, verifyAdmin, deleteKboGame);
router.post('/game/current-info', verifyToken, verifyAdmin, createKboCurrentInfo);
router.get('/game/current-info/:gameId', verifyToken, verifyAdmin, getKboCurrentInfo);
router.get('/game/:gameId/batter/:playerId/current-stats', verifyToken, verifyAdmin, getKboCurrentBatterStats);
router.get('/game/:gameId/completed-info', verifyToken, verifyAdmin, getKboGameCompletedInfo);
router.get('/game/:gameId',verifyToken, verifyAdmin, getKboGameDetail);
router.put('/game/status/update', verifyToken, verifyAdmin, updateKboGameStatus);
router.put('/game/stats/update', verifyToken, verifyAdmin, updateKboGameStats);
router.put('/game/score/update', verifyToken, verifyAdmin, updateKboGameScore);

router.post('/game/batter/stats', verifyToken, verifyAdmin, createBatterGameStats);
router.post('/game/pitcher/stats', verifyToken, verifyAdmin, createPitcherGameStats);

router.post('/game/roster/create', verifyToken, verifyAdmin, createKboGameRoster);
router.delete('/game/roster/delete', verifyToken, verifyAdmin, deleteKboGameRoster);


// 로스터 관리
router.get('/roster/list', verifyToken, verifyAdmin, getTeamRosterList);
router.get('/roster/:teamId', verifyToken, verifyAdmin, getTeamRosterDetail);
router.post('/roster/create', verifyToken, verifyAdmin, createTeamRoster);
router.delete('/roster/delete', verifyToken, verifyAdmin, deleteTeamRoster);
router.put('/roster/deactive', verifyToken, verifyAdmin, deactiveTeamRoster);
export default router;