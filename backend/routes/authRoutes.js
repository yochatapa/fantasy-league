import express from 'express';
const router = express.Router();

import { login } from '../controllers/auth/loginController.js';

router.post('/login', login);

export default router;