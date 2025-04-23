export const sendSuccess = (res, data = {}) => {
    res.status(200).json(data);
};

export const sendBadRequest = (res, message = '잘못된 요청입니다.') => {
    res.status(400).json({ message });
};

export const sendServerError = (res, error, message = '서버 오류가 발생했습니다.') => {
    console.error(message, error);
    res.status(500).json({ message, error: error.message });
};
  