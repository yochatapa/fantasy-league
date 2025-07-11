import { defineStore } from 'pinia';
import { commonFetch } from '../utils/common/commonFetch';
import { useNotificationStore } from '@/stores/notificationStore';
import router from '../router';
import { io } from 'socket.io-client';

const socket = io(`${import.meta.env.VITE_API_URL}`, {
    autoConnect: false,
    transports: ['websocket'],
});

let isNotificationListenerSet = false; // ✅ 중복 방지용 플래그

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null,
        isLoggedIn: false,
        isAuthChecked: false,
        isAdmin: false,
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

                if (response.success) {
                    if (socket.connected && this.user?.userId) {
                        socket.emit('leaveRoom', `user_${this.user.userId}`);
                        socket.disconnect();
                    }

                    this.user = null;
                    this.isLoggedIn = false;
                    this.isAuthChecked = true;
                    this.isAdmin = false;
                    localStorage.removeItem('token');
                    router.push('/');
                    location.reload();
                } else {
                    alert("로그아웃 처리 중 문제가 발생했습니다.\n잠시 후 다시 시도해 주세요.");
                }
            } catch (error) {
                console.error('서버 로그아웃 실패:', error);
            }
        },
        async checkAuth() {
            try {
                const response = await commonFetch('/api/auth/check-token', {
                    method: 'GET',
                });

                if (response.success) {
                    if (response.data.user) {
                        this.setUser(response.data.user);

                        if (!socket.connected) {
                            socket.connect();
                        }

                        socket.emit('joinRoom', `user_${response.data.user.userId}`);

                        // ✅ 알림 이벤트 리스너 등록 (1회만)
                        if (!isNotificationListenerSet) {
                            const notificationStore = useNotificationStore();

                            socket.on('notification', (payload) => {
                                console.log('[소켓 알림 수신]', payload);
                                notificationStore.addNotification({
                                    ...payload,
                                    id: payload.id ?? Date.now(), // 서버에서 id 주면 사용
                                    status: 'unread',
                                });
                            });

                            isNotificationListenerSet = true;
                        }
                    }

                    return true;
                } else {
                    throw new Error('로그인 상태가 아닙니다.');
                }
            } catch (e) {
                if (socket.connected && this.user?.userId) {
                    socket.emit('leaveRoom', `user_${this.user.userId}`);
                    socket.disconnect();
                }

                this.user = null;
                this.isLoggedIn = false;
                this.isAdmin = false;
                this.isAuthChecked = true;
                localStorage.removeItem('token');
                return false;
            } finally {
                this.isAuthChecked = true;
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
