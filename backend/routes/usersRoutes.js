import express from 'express';
const router = express.Router();

import { checkNickname, checkEmail } from '../controllers/users/usersController.js';

router.get('/check-nickname', checkNickname);
router.get('/check-email', checkEmail);

export default router;