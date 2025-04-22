import express from 'express';
const router = express.Router();

import { getHelloMessage } from '../controllers/testController.js';

router.get('/hello', getHelloMessage);

export default router;