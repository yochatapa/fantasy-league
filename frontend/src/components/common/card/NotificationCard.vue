<template>
    <v-card class="pa-2" style="min-width: 320px; max-height: 420px; overflow-y: auto;">
        <v-list density="comfortable">
            <v-list-item
                v-for="n in notifications"
                :key="n.id"
                @click="onClickNotification(n)"
                :class="[
                    'rounded-lg',
                    n.status === 'unread' ? '' : 'bg-grey-lighten-5',
                    'hover:bg-grey-lighten-4',
                ]"
            >
                <v-list-item-title
                    :class="[
                        'text-body-2',
                        'font-weight-medium',
                        n.status === 'unread' ? 'text-primary font-weight-bold' : 'text-grey-darken-2'
                    ]"
                >
                    {{ n.title }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-grey-darken-1">
                    {{ n.message }}
                </v-list-item-subtitle>
                <v-list-item-action>
                    <span class="text-caption text-grey-darken-1">
                        {{ formatTime(n.created_at) }}
                    </span>
                </v-list-item-action>
                <v-divider class="mt-2"></v-divider>
            </v-list-item>

            <v-list-item v-if="notifications.length === 0">
                <v-list-item-title class="text-caption text-grey text-center w-100">
                    알림이 없습니다.
                </v-list-item-title>
            </v-list-item>
        </v-list>
    </v-card>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotificationStore } from '@/stores/notificationStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const notificationStore = useNotificationStore();
const { notifications } = storeToRefs(notificationStore);

const onClickNotification = async (n) => {
    await notificationStore.markAsRead(n.id);
};

// 현재 시간 ref: 1분마다 갱신
const now = ref(dayjs());
let intervalId;

onMounted(() => {
    intervalId = setInterval(() => {
        now.value = dayjs();
    }, 60 * 1000);
});

onBeforeUnmount(() => {
    clearInterval(intervalId);
});

// 템플릿에서 실시간 계산용
const formatTime = (timestamp) => {
    return dayjs(timestamp).from(now.value);
};
</script>
