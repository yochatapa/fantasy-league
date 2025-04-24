import fs from 'fs/promises';
import path from 'path';

/**
 * 임시 업로드 파일을 지정된 대상 폴더로 복사하고 임시 파일을 삭제합니다.
 *
 * @param {object} fileInfo - Multer로부터 받은 파일 정보 객체 (예: req.filesInfo[0])
 * { fieldName, originalName, filename, path(임시 경로), size, mimetype, tempUrlPath }
 * @param {string} targetDir - 파일을 최종적으로 저장할 대상 폴더의 실제 서버 파일 시스템 경로
 * @returns {Promise<{ finalFilePath: string, finalFileName: string }>} - 최종 파일 경로와 파일 이름을 포함하는 객체 Promise
 * @throws {Error} - 파일 복사, 폴더 생성, 임시 파일 삭제 중 오류 발생 시
 */
export const saveUploadedFile = async (fileInfo, targetDir) => {
    if (!fileInfo || !fileInfo.path || !fileInfo.filename) {
        // 파일 정보가 불완전하면 오류 발생 또는 null 반환 등 정책 결정
        throw new Error("Invalid file information provided.");
        // 또는 return null; 처리 (호출하는 곳에서 null 체크 필요)
    }

    try {
        await fs.mkdir(targetDir, { recursive: true });
        console.log(`Target directory created if not exists: ${targetDir}`);

        const tempFilePath = fileInfo.path; // 임시 파일의 실제 서버 경로
        const finalFileName = fileInfo.filename; // 사용할 최종 파일 이름 (Multer가 생성한 이름 사용)
        const finalFilePath = path.join(targetDir, finalFileName); // 최종 파일의 실제 서버 경로

        console.log(`Copying file from ${tempFilePath} to ${finalFilePath}`);

        // 임시 파일을 최종 위치로 복사
        await fs.copyFile(tempFilePath, finalFilePath);
        console.log('File copied successfully.');

        // 복사 성공 후 임시 파일 삭제
        // await fs.unlink(tempFilePath);
        // console.log('Temporary file deleted successfully.');

        // 최종 파일의 서버 경로와 파일 이름 반환
        return {
            finalFilePath: finalFilePath,
            finalFileName: finalFileName,
        };

    } catch (error) {
        console.error(`Error processing file ${fileInfo.originalname}:`, error);
        // 에러 발생 시, 이미 업로드된 임시 파일 정리 로직 추가 고려
        // (임시 파일 삭제는 catch 블록 밖 finally에서 처리하는 것도 한 방법)

        // 에러를 다시 throw하여 호출하는 쪽(컨트롤러)에서 처리하도록 합니다.
        throw error;
    }
};

// (필요하다면 다른 파일 처리 관련 유틸 함수 추가)
// export const deleteFile = async (filePath) => { ... }
// export const getFileUrl = (filePath) => { ... } // 서버 경로 기반 URL 생성