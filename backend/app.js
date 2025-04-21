// backend/app.js
const express = require('express');
const cors = require('cors');
const helloRoutes = require('./routes/helloRoutes');  // 라우트 임포트

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 라우팅 설정
app.use('/api', helloRoutes);  // '/api' 경로에 helloRoutes 적용

module.exports = app;
