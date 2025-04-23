export async function commonFetch({ url, options = {} }) {
    try {
        const response = await fetch(url, options);
    
        if (!response.ok) {
            const errorDetail = await response.text();
            return {
                success: false,
                error: `HTTP error! status: ${response.status}, detail: ${errorDetail}`
            };
        }
    
        const data = await response.json();
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('Fetch Error:', error);
        return {
            success: false,
            error: error.message || '알 수 없는 오류가 발생했습니다.'
        };
    }
}
  