import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// ✅ 날짜만 표기 (YYYY.MM.DD)
export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = dayjs.utc(dateStr).local(); // UTC → 로컬로 변환
    if (!date.isValid()) return '';
    return date.format('YYYY.MM.DD');
};

// ✅ 날짜 + 시간 표기 (YYYY.MM.DD HH:mm)
export const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = dayjs.utc(dateStr).local(); // UTC → 로컬로 변환
    if (!date.isValid()) return '';
    return date.format('YYYY.MM.DD HH:mm');
};

// 'YYYY.MM.DD HH:mm' 문자열을 Date 객체로 파싱
export const parseDate = (str) => {
    const date = dayjs(str, 'YYYY.MM.DD HH:mm', true); // strict parsing
    return date.isValid() ? date.toDate() : null;
};

// 날짜 간 차이를 일(day) 단위로 계산
export const differenceInDays = (later, earlier) => {
    const d1 = dayjs(later).startOf('day');
    const d2 = dayjs(earlier).startOf('day');
    return d1.diff(d2, 'day');
};
