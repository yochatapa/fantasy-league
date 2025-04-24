<script setup>
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/userStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()
const { isLoggedIn, user } = storeToRefs(userStore)

const goToLogin = () => router.push('/login')
const logout = () => userStore.logout()
</script>

<template>
    <v-app-bar flat height="64" class="bg-white border-b">
        <!-- 중앙 정렬된 컨테이너 -->
        <v-container class="d-flex align-center justify-space-between" style="max-width: 1200px;">
        <!-- 로고 및 타이틀 -->
        <div class="d-flex align-center cursor-pointer" @click="router.push('/')">
            <v-icon size="28" color="primary" class="mr-2">mdi-baseball</v-icon>
            <span class="text-h6 font-weight-bold text-primary">KBO Fantasy League</span>
        </div>

        <!-- 우측 로그인 영역 -->
        <div class="d-flex align-center">
            <template v-if="isLoggedIn">
                <v-btn variant="text" class="text-body-1 text-black" @click="">{{ user?.nickname }}</v-btn>
                <v-btn variant="text" class="text-black" @click="logout">로그아웃</v-btn>
            </template>
            <template v-else>
                <v-btn variant="flat" color="primary" @click="goToLogin">로그인</v-btn>
            </template>
        </div>
        </v-container>
    </v-app-bar>
</template>
