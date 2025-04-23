<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../../stores/userStore'

const userStore = useUserStore()
const { isLoggedIn, user } = storeToRefs(userStore)

onMounted(async () => {
    
})
</script>

<template>
    <div>
        <h1>홈</h1>
        <p>isLoggedIn: {{ isLoggedIn }}</p>
        <p>user: {{ user }}</p>

        <div v-if="isLoggedIn">
            <p><strong>닉네임:</strong> {{ user?.nickname }}</p>
            <p><strong>이메일:</strong> {{ user?.email }}</p>
        </div>
        <div v-else>
            <p>로그인이 필요합니다.</p>
        </div>
    </div>
</template>
