import { PUBLIC_ROUTES } from '@/utils/code/code'

export async function commonFetch(url, options = {}) {
    const { method = 'GET', headers = {}, body } = options;

    const isJson = body && typeof body === 'object' && !(body instanceof FormData);

    const token = localStorage.getItem('token');

    const finalOptions = {
        ...options,
        method,
        headers: {
            ...headers,
            ...(isJson ? { 'Content-Type': 'application/json; charset=UTF-8' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
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
                if(!PUBLIC_ROUTES.includes(currentPath)){
                    alert("로그인 정보가 없습니다.\n다시 로그인해주세요.")
                    location.href=`${location.origin}`
                }
            }else if(response.status === 403){
                if(!PUBLIC_ROUTES.includes(currentPath)){
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
  