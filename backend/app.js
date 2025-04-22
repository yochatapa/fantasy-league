import express from 'express';
import cors from 'cors';
import testRoutes from './routes/testRoutes.js';
import usersRoutes from './routes/usersRoutes.js';

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우팅 설정
app.use('/api/test', testRoutes);
app.use('/api/users', usersRoutes);

export default app;