import express from 'express';
import verifyToken  from '../middleware/auth.js'
import { login } from '../controllers/auth/loginController.js';
import { logout } from '../controllers/auth/logoutController.js';
import { checkToken } from '../controllers/auth/tokenController.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);

router.get('/check-token', verifyToken, checkToken);

export default router;