import express from 'express';
import { checkNickname, checkEmail, signup } from '../controllers/users/usersController.js';
import handleUpload from '../middleware/upload.js';

const router = express.Router();

router.get('/check-nickname', checkNickname);
router.get('/check-email', checkEmail);

router.post('/signup', handleUpload(), signup)

export default router;