import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { sendBadRequest, sendServerError } from '../utils/apiResponse.js';

const uploadDir = path.join(process.cwd(), 'tempfiles');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const uniqueFilename = uuidv4() + '-' + file.originalname;
        cb(null, uniqueFilename);
    }
});

const parseNestedField = (base, keys, value) => {
    let current = base;
    keys.forEach((key, index) => {
        if (!isNaN(key)) key = Number(key); // 숫자 인덱스 처리
        if (index === keys.length - 1) {
            current[key] = value;
        } else {
            if (!current[key]) {
                current[key] = isNaN(keys[index + 1]) ? {} : [];
            }
            current = current[key];
        }
    });
};

export const handleUpload = () => {
    const upload = multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 }
    }).any(); // 모든 필드 이름으로 전송된 파일 처리

    return (req, res, next) => {
        upload(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                console.error('Multer Error:', err);
                return sendBadRequest(res, '파일 업로드 중 오류가 발생했습니다.');
            } else if (err) {
                console.error('Error during upload processing:', err);
                return sendServerError(res, '서버 오류입니다.');
            }

            // 파일 정보를 파싱하여 req.body에 할당
            req.files.forEach((file, index) => {
                const parsedFieldName = req.body.sendFileInfo[index]
                    .replace(/\[/g, '.')
                    .replace(/\]/g, '')
                    .split('.');

                // 파일 정보 객체 생성
                const fileInfo = {
                    originalName: file.originalname,
                    filename: file.filename,
                    path: file.path,
                    size: file.size,
                    mimetype: file.mimetype,
                };

                // req.body에 동적 경로로 매핑
                parseNestedField(req.body, parsedFieldName, fileInfo);
            });

            console.log('Updated req.body:', req.body); // 디버그용
            next();
        });
    };
};

export default handleUpload;
