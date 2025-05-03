import express from 'express';
import verifyToken  from '../middleware/auth.js'
import { fileDownload } from '../controllers/common/fileController.js';

const router = express.Router();

router.get('/download/:fileId/:sn', verifyToken, fileDownload);

export default router;