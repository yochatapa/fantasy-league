import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// JWT 토큰 검증 미들웨어
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // 'Bearer <token>'

    if (!token) {
        return res.status(401).json({ success: false, message: '토큰이 제공되지 않았습니다.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다.' });
        }

        // 인증된 사용자 정보 저장 (옵션)
        req.user = decoded;  // decoded는 JWT의 페이로드 (예: 사용자 정보)
        next();  // 다음 미들웨어나 라우트 핸들러로 이동
    });
};

export default verifyToken;