<script setup>
import { ref, onMounted } from 'vue'
import { commonFetch } from '../../utils/common/commonFetch'

const message = ref('')

onMounted(async () => {
  const res = await commonFetch(`${import.meta.env.VITE_API_URL}/api/test/hello`)
  message.value = res.data.message
})
</script>

<template>
  <h1>홈: {{ message }}</h1>
</template>
