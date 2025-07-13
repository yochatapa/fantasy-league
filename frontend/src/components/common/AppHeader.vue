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
                    <!-- PC 알림 아이콘 -->
                    <v-menu offset-y v-if="!isMobile">
                        <template #activator="{ props }">
                            <div v-bind="props" class="mr-3 position-relative cursor-pointer">
                                <v-icon size="28" color="primary">mdi-bell-outline</v-icon>
                                <div
                                    v-if="unreadCount > 0"
                                    class="position-absolute"
                                    style="top: 0px; right: 0px; width: 8px; height: 8px; background-color: red; border-radius: 50%;"
                                ></div>
                            </div>
                        </template>
                        <NotificationCard />
                    </v-menu>

                    <!-- 사용자 아바타 -->
                    <v-menu offset-y>
                        <template #activator="{ props }">
                            <div  class="position-relative">
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
                                <div
                                    v-if="isMobile && unreadCount > 0"
                                    class="position-absolute"
                                    style="top: 0px; right: 0px; width: 6px; height: 6px; background-color: red; border-radius: 50%;"
                                ></div>
                            </div>
                        </template>

                        <v-card min-width="220" class="pa-2 position-relative">
                            <!-- 모바일: 알림 벨 아이콘 -->
                            <template v-if="isMobile">
                                <div class="position-absolute" style="top: 10px; right: 10px;">
                                    <v-menu offset-y>
                                        <template #activator="{ props }">
                                            <div v-bind="props" class="position-relative cursor-pointer">
                                                <v-icon size="24" color="primary">mdi-bell-outline</v-icon>
                                                <div
                                                    v-if="unreadCount > 0"
                                                    class="position-absolute"
                                                    style="top: 0px; right: 0px; width: 6px; height: 6px; background-color: red; border-radius: 50%;"
                                                ></div>
                                            </div>
                                        </template>
                                        <NotificationCard />
                                    </v-menu>
                                </div>
                            </template>

                            <!-- 사용자 정보 -->
                            <div class="px-2 py-1 mt-2">
                                <div class="text-subtitle-1 font-weight-medium">{{ user?.nickname }}</div>
                                <div class="text-caption text-grey-darken-1">{{ user?.email }}</div>
                            </div>

                            <v-divider class="my-2" />

                            <v-btn variant="text" color="primary" block @click="router.push('/profile')">
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
import NotificationCard from './card/NotificationCard.vue'
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/userStore'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'
import { useDisplay } from 'vuetify'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { mobile } = useDisplay()
const isMobile = computed(() => mobile.value)

const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)
const unreadCount = computed(() => notificationStore.unreadCount)

onMounted(() => {
    notificationStore.fetchNotifications()
})

const onClickNotification = async (n) => {
    await notificationStore.markAsRead(n.id)
    // TODO: 알림에 따라 페이지 이동 처리 필요
}

const formatTime = (timestamp) => {
    return dayjs(timestamp).fromNow()
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { isLoggedIn, user } = storeToRefs(userStore)

const goToLogin = () => router.push('/login')
const logout = () => userStore.logout()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const goHome = () => {
    location.href = `${location.origin}${isAdminRoute.value ? '/admin' : ''}`
}
</script>
