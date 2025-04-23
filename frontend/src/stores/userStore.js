// stores/userStore.ts (Pinia 예시)
import { defineStore } from 'pinia'
import { commonFetch } from '../utils/common/commonFetch'; // commonFetch 가져오기

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null, // user 정보
        isLoggedIn: false,
    }),
    actions: {
        setUser(userData) {
            this.user = userData;
            this.isLoggedIn = true;
        },
        logout() {
            this.user = null;
            this.isLoggedIn = false;
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
                this.logout();
                return false;
            }
        },
    },
});
