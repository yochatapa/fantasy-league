import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import testRoutes from './routes/testRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

// 미들웨어 설정
app.use(cors({
    origin: 'http://localhost:5173', // 정확한 origin 명시
    credentials: true,               // 쿠키 포함 허용
}));
app.use(express.json());
app.use(cookieParser())

// 라우팅 설정
app.use('/api/test' , testRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth' , authRoutes);

export default app;