import { query, withTransaction } from '../../db.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js';
import dotenv from 'dotenv';
import path from 'path'; // 경로 처리 모듈

dotenv.config();

export const fileDownload = async (req, res) => {
    const { fileId } = req.params;
    let { sn } = req.params;

    if(!sn) sn = 1;

    try {
        const { rows } = await query(`
            SELECT original_name, path, mimetype 
            FROM file_table 
            WHERE file_id = $1 AND sn = $2
        `, [fileId, sn]);

        if (rows.length === 0) {
            return sendBadRequest(res, "파일을 찾을 수 없습니다.");
        }
        
        const file = rows[0];
        const filePath = path.resolve(file.path);

        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        res.download(filePath, encodeURIComponent(file.original_name));
    } catch (err) {
        return sendServerError(res, error, "파일 다운로드 중 오류 발생"); 
    }
};