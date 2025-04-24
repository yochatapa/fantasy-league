<script setup>
import { RouterView } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'

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
    </template>
    <!-- <template v-else>
      <v-main class="d-flex justify-center align-center" style="height: 100vh;">
        <v-progress-circular indeterminate color="primary" size="48" />
      </v-main>
    </template> -->
  </v-app>
</template>