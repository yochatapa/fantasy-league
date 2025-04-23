import { useRouter } from 'vue-router';

export async function commonFetch(url, options = {}) {
    const { method = 'GET', headers = {}, body } = options;

    const router = useRouter();

    const isJson = body && typeof body === 'object' && !(body instanceof FormData);

    const token = localStorage.getItem('token');

    const finalOptions = {
        ...options,
        method,
        headers: {
            ...headers,
            ...(isJson ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: isJson ? JSON.stringify(body) : body,
    };

    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            const errorDetail = await response.json();
            console.log(errorDetail)
            if(response.status === 401){
                alert("로그인 정보가 없습니다.\n다시 로그인해주세요.")
                await router.push("/")
            }else if(response.status === 403){
                alert("접근 권한이 없습니다.\n다시 로그인해주세요.")
                await router.push("/")
            }
            return {
                success: false,
                message : errorDetail?.message || '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
                code : errorDetail?.code || -1,
                data : errorDetail
            };
        }
    
        const data = await response.json();
        return {
            success: true,
            message : data?.message || "요청이 정상적으로 처리되었습니다.",
            data
        };
    } catch (error) {
        console.error('Fetch Error:', error);
        return {
            success: false,
            message : error?.message || '서버와의 통신 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.' ,
            code : errorDetail?.code || -1,
            data: error
        };
    }
}
  