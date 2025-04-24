import fs from 'fs/promises';  // fs.promises를 사용하여 비동기 파일 작업을 수행

/**
 * 파일 경로와 MIME 타입을 받아서, 해당 파일을 Base64로 변환하여 반환하는 함수
 * @param {string} filePath - 파일의 경로
 * @param {string} mimeType - 파일의 MIME 타입 (예: 'image/png', 'image/jpeg')
 * @returns {Promise<string>} - Base64로 인코딩된 이미지 데이터
 */
const convertFileToBase64 = async (filePath, mimeType) => {
    try {
        // 파일을 읽어서 Buffer로 변환
        const fileBuffer = await fs.readFile(filePath);

        // 파일을 Blob으로 변환하고, ArrayBuffer로 변환
        const blob = new Blob([fileBuffer], { type: mimeType });
        const arrayBuffer = await blob.arrayBuffer();

        // Base64로 변환
        const base64Image = Buffer.from(arrayBuffer).toString('base64');

        // Base64로 변환된 데이터를 'data:image/png;base64,' 형식으로 반환
        return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
        console.error('파일을 Base64로 변환하는 중 오류 발생:', error);
        return null;
    }
};

export default convertFileToBase64;