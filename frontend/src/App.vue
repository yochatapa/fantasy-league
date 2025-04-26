<script setup>
import { RouterView } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useAlertStore } from '@/stores/alertStore';

const alert = useAlertStore();

const userStore = useUserStore()
const { isAuthChecked } = storeToRefs(userStore)

onMounted(() => {
    userStore.checkAuth()
})
</script>

<template>
    <v-app>
        <!-- ✅ 인증 확인 전이면 로딩 화면 또는 빈 화면 -->
        <template v-if="isAuthChecked">
            <!-- 헤더: 전체 너비 + 하단 구분선 -->
            <AppHeader />

            <!-- 메인 콘텐츠: 가운데 정렬 + 적당한 너비 -->
            <v-main class="bg-grey-lighten-5">
                <v-container
                class="pt-6"
                style="max-width: 1200px; margin: 0 auto;"
                fluid
                >
                    <RouterView />
                </v-container>
            </v-main>
            <!-- Snackbar Alert -->
            <v-snackbar
                v-model="alert.snackbar"
                :color="alert.snackbarColor"
                timeout="3000"
                location="top center"
            >
                {{ alert.snackbarMessage }}
            </v-snackbar>

            <!-- Confirm Dialog -->
            <v-dialog v-model="alert.dialog" width="400">
                <v-card>
                    <v-card-title class="text-h6">확인</v-card-title>
                    <v-card-text>{{ alert.dialogMessage }}</v-card-text>
                    <v-card-actions>
                        <v-spacer />
                        <v-btn text @click="alert.confirmNo()">취소</v-btn>
                        <v-btn color="primary" text @click="alert.confirmYes()">확인</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </template>
    </v-app>
</template>