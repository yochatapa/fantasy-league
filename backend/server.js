// backend/server.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import process from 'process';
import app from './app.js';
import http from 'http';
import { setupSocket } from './utils/socket.js';
import './scheduler/draftScheduler.js';

const PORT = 3000;

// ❗ 기존 app.listen 제거하고 http 서버로 감쌈
const server = http.createServer(app);

// Socket.IO 연결
setupSocket(server);

// 정적 파일 경로 설정
const staticUploadsBaseDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(staticUploadsBaseDir));

// --- 초기화 작업: 디렉토리 확인 및 생성 ---

// 1. 임시 업로드 디렉토리 생성 (동기)
const tempUploadDir = path.join(process.cwd(), 'tempfiles');
if (!fs.existsSync(tempUploadDir)) {
    console.log(`Creating temporary upload directory: ${tempUploadDir}`);
    try {
        fs.mkdirSync(tempUploadDir, { recursive: true });
        console.log(`Temporary upload directory created: ${tempUploadDir}`);
    } catch (err) {
        console.error(`Error creating temporary upload directory ${tempUploadDir}:`, err);
        process.exit(1);
    }
}

// 2. 최종 업로드 디렉토리 생성 (비동기)
const finalUploadsBaseDir = path.join(process.cwd(), 'uploads');
const ensureFinalUploadsBaseDir = async () => {
    if (!fs.existsSync(finalUploadsBaseDir)) {
        console.log(`Creating base upload directory: ${finalUploadsBaseDir}`);
        try {
            await fs.promises.mkdir(finalUploadsBaseDir, { recursive: true });
            console.log(`Base upload directory created: ${finalUploadsBaseDir}`);
        } catch (err) {
            console.error(`Error creating base upload directory ${finalUploadsBaseDir}:`, err);
            process.exit(1);
        }
    }
};

// --- 초기화 후 서버 시작 ---
ensureFinalUploadsBaseDir()
    .then(() => {
        console.log("All necessary upload directories are ready.");
    })
    .then(() => {
        console.log("Server initialization complete. Starting server...");
        server.listen(PORT, () => {  // ← 여기서 http 서버 listen
            console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Temporary files saved in: ${tempUploadDir}`);
            console.log(`Static files served from /uploads at ${staticUploadsBaseDir}`);
        });
    })
    .catch((error) => {
        console.error("Server initialization failed:", error);
        process.exit(1);
    });
