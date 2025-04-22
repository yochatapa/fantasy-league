<script setup>
import { ref, onMounted } from 'vue'

const message = ref('')

onMounted(async () => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/test/hello`)
  const data = await res.json()
  message.value = data.message
})
</script>

<template>
  <h1>홈: {{ message }}</h1>
</template>
