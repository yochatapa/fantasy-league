export const sendSuccess = (res, data = { message : '요청이 정상적으로 처리되었습니다.' }) => {
    const message = data?.message || '요청이 정상적으로 처리되었습니다.'
    res.status(200).json({...data, message : message});
};

export const sendBadRequest = (res, message = '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.') => {
    if (typeof message === 'string') {
        res.status(400).json({ message });
    } else {
        res.status(400).json({
            ...message,
            message: message.message || '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
    }
};

export const sendServerError = (res, error, message = '서버와의 통신 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.') => {
    if (typeof message === 'string') {
        console.error(message, error);
        res.status(500).json({ message });
    } else {
        const finalMessage = message.message || '서버와의 통신 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
        console.error(finalMessage, error);
        res.status(500).json({
            ...message,
            message: finalMessage
        });
    }
};