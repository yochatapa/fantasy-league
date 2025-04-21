import express from 'express';
import cors from 'cors';
import helloRoutes from './routes/helloRoutes.js';

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우팅 설정
app.use('/api', helloRoutes);

export default app;