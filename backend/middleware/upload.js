import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { sendBadRequest, sendServerError } from '../utils/apiResponse.js';

// 서버 시작 시점에 업로드 디렉토리 존재 확인 및 생성 (동기 방식 권장)
const uploadDir = path.join(process.cwd(), 'tempfiles');

// 디스크 저장 설정 (destination 함수는 동기)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 디렉토리는 이미 서버 시작 시점에 생성되었거나 여기서 동기적으로 확인
        // 여기서 비동기 작업(await)을 수행하면 안 됩니다.
        cb(null, uploadDir); // 저장될 서버의 디렉토리 경로를 동기적으로 콜백에 전달
    },
    filename: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
        const uniqueFilename = uuidv4() + '-' + file.originalname; // 고유한 파일 이름 생성
        cb(null, uniqueFilename); // 파일 이름을 동기적으로 콜백에 전달
    }
});

// handleUpload 미들웨어 생성
export const handleUpload = (fields = []) => {
    const upload = multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 } // 최대 파일 크기 10MB
         // 파일 필터링을 추가하려면 여기에 fileFilter 옵션 추가
    }).fields(fields); // 여러 개의 파일 필드를 처리

    // Multer 미들웨어 자체를 반환하거나 라우트 체인에서 바로 사용
    // 여기서는 반환된 함수 안에서 Multer 미들웨어를 호출하는 방식 유지 (원 코드 형태 존중)
    return (req, res, next) => {
        upload(req, res, (err) => {
            // 이 콜백은 Multer 업로드 처리가 완료된 후 호출됩니다.
            if (err instanceof multer.MulterError) {
                console.error('Multer Error:', err); // 서버 로그에 에러 자세히 기록
                return sendBadRequest(res, '파일 업로드 중 오류가 발생했습니다.');
            } else if (err) {
                 console.error('Error during upload processing:', err); // 서버 로그에 에러 자세히 기록
                 return sendServerError(res, '서버 오류입니다.');
            }

            // 업로드 성공 시 req.files에 파일 정보가 담깁니다.
            // req.filesInfo를 구성하는 로직은 그대로 사용 가능
            const filesInfo = Object.keys(req.files || {}).map((fieldName) => { // req.files가 없을 경우 대비
                return req.files[fieldName].map((file) => ({
                    fieldName,
                    originalName: file.originalname,
                    filename: file.filename,
                    path: file.path, // 서버에 저장된 파일 경로 (diskStorage 사용 시)
                    size: file.size,
                    mimetype: file.mimetype,
                }));
            }).flat();

            req.filesInfo = filesInfo; // 처리된 파일 정보를 req 객체에 추가

            // 다음 미들웨어 또는 최종 라우트 핸들러로 진행
            next();
        });
    };
};

export default handleUpload; // 필요에 따라 기본 export는 유지