// backend/server.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import process from 'process'
import app from './app.js';

const PORT = 3000;

app.listen(PORT);

const staticUploadsBaseDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(staticUploadsBaseDir));

// --- 여기에서 필요한 초기화 작업 수행 (서버 시작 전) ---

// 1. 임시 업로드 디렉토리 존재 확인 및 생성 (동기 방식)
// handleUpload.js 파일의 uploadDir 정의와 동일한 경로를 사용
const tempUploadDir = path.join(process.cwd(), 'tempfiles'); // <-- 여기서도 경로 정의

if (!fs.existsSync(tempUploadDir)) { // <-- 동기 확인
    console.log(`Creating temporary upload directory: ${tempUploadDir}`);
    try {
        fs.mkdirSync(tempUploadDir, { recursive: true }); // <-- 동기 생성
        console.log(`Temporary upload directory created: ${tempUploadDir}`);
    } catch (err) {
        console.error(`Error creating temporary upload directory ${tempUploadDir}:`, err);
        // 심각한 에러이므로 서버 시작 중단
        process.exit(1); // 중요
    }
}

// 2. 최종 업로드 디렉토리 Base 경로 존재 확인 및 생성 (비동기 방식 - 이전 답변 코드)
// 이 로직은 비동기 fs를 사용하므로 await 또는 .then 사용 필요
const finalUploadsBaseDir = path.join(process.cwd(), 'uploads');
const ensureFinalUploadsBaseDir = async () => {
     if (!fs.existsSync(finalUploadsBaseDir)) { // 비동기 함수 안이지만 동기 체크 먼저 해도 무방
        console.log(`Creating base upload directory: ${finalUploadsBaseDir}`);
        try {
            await fs.promises.mkdir(finalUploadsBaseDir, { recursive: true }); // 비동기 생성
            console.log(`Base upload directory created: ${finalUploadsBaseDir}`);
        } catch (err) {
            console.error(`Error creating base upload directory ${finalUploadsBaseDir}:`, err);
            process.exit(1);
        }
    }
};

// --- 모든 초기화 작업 완료 대기 후 서버 시작 ---
// 임시 폴더 생성은 동기이므로 바로 진행되고, 비동기인 최종 폴더 생성만 기다리면 됩니다.
ensureFinalUploadsBaseDir() // 비동기 함수 호출
    .then(() => {
        console.log("All necessary upload directories are ready.");
        // DB 연결 등 다른 비동기 초기화 작업이 있다면 여기에 체이닝
        // return db.connect();
    })
    .then(() => {
        console.log("Server initialization complete. Starting server...");
        // 모든 초기화 완료 후 서버 시작
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Temporary files saved in: ${tempUploadDir}`);
            console.log(`Static files served from /uploads at ${staticUploadsBaseDir}`);
        });
    })
    .catch((error) => {
        console.error("Server initialization failed:", error);
        process.exit(1); // 초기화 실패 시 종료
    });