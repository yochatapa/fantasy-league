import { PUBLIC_ROUTES } from '@/utils/code/code'

export async function commonFetch(url, options = {}) {
    const { method = 'GET', headers = {}, body } = options;

    const isJson = body && typeof body === 'object' && !(body instanceof FormData);

    // FormData인 경우 sendFileInfoLength를 확인하여 헤더에 포함
    let sendFileInfoLength = 0;
    if (body instanceof FormData) {
        sendFileInfoLength = body.get('sendFileInfoLength') || 0;  // FormData에서 sendFileInfoLength 값 가져오기
    }

    const token = localStorage.getItem('token');

    const finalOptions = {
        ...options,
        method,
        headers: {
            ...headers,
            ...(isJson ? { 'Content-Type': 'application/json; charset=UTF-8' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(sendFileInfoLength ? { 'X-File-Info-Length': sendFileInfoLength } : {})  // sendFileInfoLength가 있으면 헤더에 추가
        },
        body: isJson ? JSON.stringify(body) : body,
        credentials: 'include',
    };
    
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}`+url, finalOptions);
        
        if (!response.ok) {
            const errorDetail = await response.json();
            const currentPath = window.location.pathname;
            
            if(response.status === 401){
                if(!PUBLIC_ROUTES.some(route => currentPath.startsWith(route))){
                    alert("로그인 정보가 없습니다.\n다시 로그인해주세요.")
                    location.href=`${location.origin}`
                }
            }else if(response.status === 403){
                if(!PUBLIC_ROUTES.some(route => currentPath.startsWith(route))){
                    alert("접근 권한이 없습니다.\n다시 로그인해주세요.")
                    location.href=`${location.origin}`
                }
            }
            return {
                success: false,
                message : errorDetail?.message || '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
                code : errorDetail?.code || -1,
                data : errorDetail
            };
        }
        
        if(options.responseType === "fileDownload"){
            const data = await response.blob();

            const disposition = response.headers.get('Content-Disposition');
            let filename = 'downloaded_file';
            if (disposition) {
                // RFC 5987 형식(filename*=UTF-8'') 우선 처리
                const utf8FilenameRegex = /filename\*\=UTF-8''(.+)/;
                const plainFilenameRegex = /filename="(.+?)"/;
            
                if (utf8FilenameRegex.test(disposition)) {
                    filename = disposition.match(utf8FilenameRegex)[1];
            
                    // ⚠️ 두 번 디코딩 처리
                    filename = decodeURIComponent(decodeURIComponent(filename));
                } else if (plainFilenameRegex.test(disposition)) {
                    filename = decodeURIComponent(disposition.match(plainFilenameRegex)[1]);
                }
            }
            console.log(filename);
            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);

            return {
                success: true,
                message : data?.message || "요청이 정상적으로 처리되었습니다.",
            };
        }
        else{
            const data = await response.json();
        
            if(data.token && data.access){
                localStorage.setItem("token",data.token)
                return commonFetch(url, options)
            }

            return {
                success: true,
                message : data?.message || "요청이 정상적으로 처리되었습니다.",
                data
            };
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        return {
            success: false,
            message : error?.message || '서버와의 통신 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.' ,
            code : error?.code || -1,
            data: error
        };
    }
}
  

/**
 * 객체를 FormData로 변환하는 공통 함수
 * @param {Object} data - 변환할 객체
 * @returns {FormData} - 변환된 FormData 인스턴스
 */
export const getNewFormData = (data) => {
    const formData = new FormData();
    const sendFile = new Array();  // 파일을 담을 FormData
    const sendFileInfo = new Array();  // 파일 정보를 담을 FormData

    // FormData에 데이터를 추가하는 공통 함수
    const appendFormData = (parentKey, value) => {
        if (value instanceof File) {
            // 📌 파일은 sendFile에 추가
            sendFile.push(value);
            sendFileInfo.push(parentKey);  // 파일이 추가된 필드 이름 기록
            formData.append(parentKey, '');
        } else if (Array.isArray(value)) {
            // 📌 배열 처리
            value.forEach((item, index) => {
                appendFormData(`${parentKey}[${index}]`, item);
            });
        } else if (typeof value === 'object' && value !== null) {
            // 📌 객체 처리 (재귀적 탐색)
            Object.keys(value).forEach(key => {
                appendFormData(`${parentKey}[${key}]`, value[key]);
            });
        } else if (value instanceof Date) {
            // 📌 날짜 처리 (YYYY-MM-DD 형식으로 변환)
            const formattedDate = value.toISOString().split('T')[0];
            formData.append(parentKey, formattedDate);
        } else {
            // 📌 기본 자료형 처리 (숫자, 문자열, 불리언)
            formData.append(parentKey, value ?? '');
        }
    };

    // 🔹 최상위 키 순회
    Object.keys(data).forEach(key => {
        appendFormData(key, data[key]);
    });

    sendFile.forEach((file, index) => {
        formData.append(`sendFile[${index}]`, file);
    });

    sendFileInfo.forEach((fileName, index) => {
        formData.append(`sendFileInfo[${index}]`, fileName);
    })

    formData.append(`sendFileInfoLength`, sendFileInfo.length);

    return formData;  // FormData 객체만 반환
};
