import express from 'express';
const router = express.Router();

import { checkNickname, checkEmail, signup } from '../controllers/users/usersController.js';

router.get('/check-nickname', checkNickname);
router.get('/check-email', checkEmail);

router.post('/signup', signup)

export default router;