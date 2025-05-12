import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser'
import testRoutes from './routes/testRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import authRoutes from './routes/authRoutes.js';
import leagueRoutes from './routes/leagueRoutes.js';
import kboRoutes from './routes/kboRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import fileRoutes from './routes/fileRoutes.js';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 미들웨어 설정
app.use(cors({
    origin: process.env.FRONTEND_URL, // 정확한 origin 명시
    credentials: true,               // 쿠키 포함 허용
}));
app.use(express.json());
app.use(cookieParser());

if(process.env.SERVE_FRONTEND === 'true'){
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// 라우팅 설정
app.use('/api/test' , testRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth' , authRoutes);
app.use('/api/league', leagueRoutes);
app.use('/api/kbo', kboRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/file', fileRoutes);

if(process.env.SERVE_FRONTEND === 'true'){
    app.get(/^\/(.*)?$/, (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
    });
}

export default app;