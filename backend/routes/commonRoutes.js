import express from 'express';
import { verifyToken }  from '../middleware/auth.js'
import { getNotificationList, markNotificationAsRead } from '../controllers/common/notificationController.js';
const router = express.Router();

router.get('/notifications', verifyToken, getNotificationList);

router.post('/notifications/read', verifyToken, markNotificationAsRead);

export default router;