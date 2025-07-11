import { defineStore } from 'pinia';
import { commonFetch } from '@/utils/common/commonFetch';

export const useNotificationStore = defineStore('notification', {
    state: () => ({
        notifications: [],
    }),
    getters: {
        unreadCount: (state) =>
            state.notifications.filter((n) => n.status === 'unread').length,
    },
    actions: {
        async fetchNotifications() {
            const response = await commonFetch('/api/common/notifications', { method: 'GET' });
            if (response.success) {
                this.notifications = response.data.notifications;
            } else {
                this.notifications = []; // fallback
            }
        },
        addNotification(notification) {
            this.notifications.unshift(notification);
        },
        async markAsRead(id) {
            const notif = this.notifications.find((n) => n.id === id);
            if (!notif || notif.status === 'read') return;

            const res = await commonFetch('/api/common/notifications/read', {
                method: 'POST',
                body: {
                    id
                },
            });

            if (res.success) {
                notif.status = 'read';
            }
        },
    },
});
