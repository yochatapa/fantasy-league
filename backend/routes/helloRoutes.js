// backend/routes/helloRoutes.js
const express = require('express');
const router = express.Router();
const helloController = require('../controllers/helloController');  // 컨트롤러 임포트

// /api/hello 경로로 오는 GET 요청을 helloController의 getHelloMessage로 처리
router.get('/hello', helloController.getHelloMessage);

module.exports = router;