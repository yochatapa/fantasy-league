<script setup>
import { RouterView, useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'
import { onMounted, computed } from 'vue'
import { useAlertStore } from '@/stores/alertStore'

const route = useRoute()
const alert = useAlertStore()

const userStore = useUserStore()
const { isAuthChecked } = storeToRefs(userStore)

onMounted(() => {
    userStore.checkAuth()
})

// ✅ 경로가 /admin으로 시작하는지 확인
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
</script>

<template>
    <v-app>
        <!-- ✅ 인증 체크 완료 시에만 표시 -->
        <template v-if="isAuthChecked">
            <!-- ✅ Admin Route인 경우: 관리자 레이아웃만 표시 -->
            <template v-if="isAdminRoute">
                <AppHeader />
                <v-main class="bg-grey-lighten-5">
                    <v-container
                        class="pt-6 position-relative"
                        style="max-width: 1200px; margin: 0 auto;padding-top: 0px !important;"
                        fluid
                    >
                        <RouterView />
                    </v-container>
                </v-main>
            </template>

            <!-- ✅ 일반 사용자 레이아웃 -->
            <template v-else>
                <!-- 공통 헤더 -->
                <AppHeader />

                <v-main class="bg-grey-lighten-5">
                    <v-container
                        class="pt-6 position-relative"
                        style="max-width: 1200px; margin: 0 auto;"
                        fluid
                    >
                        <RouterView />
                    </v-container>
                </v-main>
            </template>

            <!-- Snackbar Alert -->
            <v-snackbar
                v-model="alert.snackbar"
                :color="alert.snackbarColor"
                timeout="3000"
                location="top center"
            >
                <div style="white-space: pre-line;">
                    {{ alert.snackbarMessage }}
                </div>
            </v-snackbar>

            <!-- Confirm Dialog -->
            <v-dialog v-model="alert.dialog" width="400">
                <v-card>
                    <v-card-title class="text-h6">확인</v-card-title>
                    <v-card-text v-html="alert.dialogMessage"></v-card-text>
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
