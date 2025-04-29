// stores/userStore.ts (Pinia 예시)
import { defineStore } from 'pinia'
import { commonFetch } from '../utils/common/commonFetch'; // commonFetch 가져오기
import router from '../router';

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null, // user 정보
        isLoggedIn: false,
        isAuthChecked: false,
        isAdmin : false,
    }),
    actions: {
        setUser(userData) {
            this.user = userData;
            this.isLoggedIn = true;
            this.isAdmin = this.user.isAdmin;
        },
        async logout() {
            try {
                const response = await commonFetch('/api/auth/logout', {
                    method: 'POST',
                });

                if(response.success){
                    this.user = null;
                    this.isLoggedIn = false;
                    this.isAuthChecked = true;
                    this.isAdmin = false;
                    localStorage.removeItem('token');
                    router.push("/")
                } else {
                    alert("로그아웃 처리 중 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.")
                }
            } catch (error) {
                console.error('서버 로그아웃 실패:', error);
                // 필요하다면 사용자에게 에러 메시지를 보여줄 수 있음
            }
        },
        async checkAuth() {
            try {
                // commonFetch 사용하여 API 호출
                const response = await commonFetch('/api/auth/check-token', {
                    method: 'GET',
                });
                
                if (response.success) {
                    if(response.data.user) this.setUser(response.data.user);
                    return true;
                } else {
                    throw new Error('로그인 상태가 아닙니다.');
                }
            } catch (e) {
                this.user = null;
                this.isLoggedIn = false;
                this.isAdmin = false;
                this.isAuthChecked = true;
                localStorage.removeItem('token');
                return false;
            } finally {
                this.isAuthChecked = true
            }
        },
        async checkAdmin() {
            try {
                const response = await commonFetch('/api/auth/check-admin', { method: 'GET' });
                return response.success && response.data.isAdmin === true;
            } catch {
                return false;
            }
        },
    },
});
