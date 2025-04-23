import express from 'express';
import verifyToken from '../middleware/auth.js';
import { getHelloMessage } from '../controllers/testController.js';

const router = express.Router();

router.get('/hello', verifyToken, getHelloMessage);

export default router;