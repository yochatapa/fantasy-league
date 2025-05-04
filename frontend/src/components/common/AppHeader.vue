<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/userStore'
import { useRoute, useRouter } from 'vue-router'

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
