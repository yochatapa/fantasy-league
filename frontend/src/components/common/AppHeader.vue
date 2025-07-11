<template>
    <v-app-bar flat height="64" class="bg-white border-b">
        <v-container class="d-flex align-center justify-space-between" style="max-width: 1200px;">
            <!-- 로고 및 타이틀 --> 
            <div class="d-flex align-center cursor-pointer" @click="goHome">
                <v-icon size="28" color="primary" class="mr-2">mdi-baseball</v-icon>
                <span class="text-h6 font-weight-bold text-primary">KBO Fantasy League</span>
            </div>

            <!-- 우측 사용자 메뉴 -->
            <div class="d-flex align-center">
                <template v-if="isLoggedIn">
                    <v-menu offset-y>
                        <template #activator="{ props }">
                            <div v-bind="props" class="mr-3 position-relative cursor-pointer">
                                <v-icon size="28" color="primary">mdi-bell-outline</v-icon>
                                <div
                                    v-if="unreadCount > 0"
                                    class="position-absolute rounded-circle"
                                    style="top: -4px; right: -4px; width: 10px; height: 10px; background-color: red;"
                                ></div>
                            </div>
                        </template>

                        <v-card style="min-width: 300px; max-height: 400px; overflow-y: auto;">
                            <v-list>
                                <v-list-item
                                    v-for="n in notifications"
                                    :key="n.id"
                                    @click="onClickNotification(n)"
                                    :class="n.status === 'unread' ? '' : 'bg-grey-lighten-3'"
                                >
                                    <v-list-item-title class="text-body-2 font-weight-medium">
                                        {{ n.title }}
                                    </v-list-item-title>
                                    <v-list-item-subtitle class="text-caption">
                                        {{ n.message }}
                                    </v-list-item-subtitle>
                                </v-list-item>
                                <v-list-item v-if="notifications.length === 0">
                                    <v-list-item-title class="text-caption text-grey">알림이 없습니다.</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-card>
                    </v-menu>
                    <v-menu offset-y>
                        <template #activator="{ props }">
                            <v-avatar
                                v-bind="props"
                                size="36"
                                class="cursor-pointer"
                                style="border: 2px solid #ccc;"
                            >
                                <v-img
                                    v-if="user?.profileImage"
                                    :src="user.profileImage"
                                    alt="User Image"
                                />
                                <v-icon v-else size="28" color="#666">mdi-account-circle</v-icon>
                            </v-avatar>
                        </template>
                        <v-card min-width="200" class="pa-2">
                            <div class="px-2 py-1">
                                <div class="text-subtitle-1 font-weight-medium">{{ user?.nickname }}</div>
                                <div class="text-caption text-grey-darken-1">{{ user?.email }}</div>
                            </div>
                            <v-divider class="my-2"></v-divider>
                            <v-btn
                                variant="text"
                                color="primary"
                                block
                                @click="router.push('/profile')"
                            >
                                내 정보 관리
                            </v-btn>
                            <v-btn
                                variant="text"
                                color="error"
                                block
                                class="mt-1"
                                @click="logout"
                            >
                                <v-icon start size="18">mdi-logout</v-icon>
                                로그아웃
                            </v-btn>
                        </v-card>
                    </v-menu>
                </template>
                <template v-else>
                    <v-btn variant="flat" color="primary" @click="goToLogin">로그인</v-btn>
                </template>
            </div>
        </v-container>
    </v-app-bar>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/userStore'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore';

const notificationStore = useNotificationStore();
const { notifications } = storeToRefs(notificationStore);
const unreadCount = computed(() => notificationStore.unreadCount);

onMounted(() => {
    notificationStore.fetchNotifications(); // 최초 진입 시 알림 불러오기
});

const onClickNotification = async (n) => {
    await notificationStore.markAsRead(n.id);
    // TODO: 관련 페이지로 이동 필요시 router.push(`/draft/${n.related_id}`) 등
};

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { isLoggedIn, user } = storeToRefs(userStore)

const goToLogin = () => router.push('/login')
const logout = () => userStore.logout()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

const goHome = () => {
    location.href=`${location.origin}${isAdminRoute.value?'/admin':''}`
}
</script>