import express from 'express';
const router = express.Router();

import { checkNickname } from '../controllers/users/usersController.js';

router.get('/check-nickname', checkNickname);

export default router;