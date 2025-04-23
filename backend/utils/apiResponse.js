export const sendSuccess = (res, data = { message : '요청이 정상적으로 처리되었습니다.' }) => {
    const message = data?.message || '요청이 정상적으로 처리되었습니다.'
    res.status(200).json({...data, message : message, code : 0 });
};

export const sendBadRequest = (res, message = '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.') => {
    if (typeof message === 'string') {
        res.status(400).json({ message , code : -1 });
    } else {
        res.status(400).json({
            ...message,
            code : message.code || -1,
            message: message.message || '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
    }
};

export const sendServerError = (res, error, message = '서버와의 통신 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.') => {
    if (typeof message === 'string') {
        console.error(message, error);
        res.status(500).json({ message , code : -1 });
    } else {
        const finalMessage = message.message || '서버와의 통신 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
        console.error(finalMessage, error);
        res.status(500).json({
            ...message,
            code : message.code || -1,
            message: finalMessage
        });
    }
};

export const sendNoTokenRequest = (res, message = '토큰이 존재하지 않습니다.') => {
    if (typeof message === 'string') {
        res.status(401).json({ message, code : -99 });
    } else {
        res.status(401).json({
            ...message,
            code : message.code || -99,
            message: message.message || '토큰이 존재하지 않습니다.'
        });
    }
};

export const sendInvalidTokenRequest = (res, message = '유효하지 않은 토큰입니다.') => {
    if (typeof message === 'string') {
        res.status(403).json({ message, code : -99 });
    } else {
        res.status(403).json({
            ...message,
            code : message.code || -99,
            message: message.message || '유효하지 않은 토큰입니다.'
        });
    }
};