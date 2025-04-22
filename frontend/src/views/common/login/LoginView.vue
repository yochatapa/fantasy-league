<template>
  <v-container class="d-flex justify-center align-center" style="height: 100vh;">
    <v-row class="d-flex justify-center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title>
            <span class="headline">Login</span>
          </v-card-title>

          <v-card-text>
            <v-form @submit.prevent="login">
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                required
              />
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                required
              />
              <v-btn color="primary" type="submit" block>
                Login
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions>
            <v-btn text @click="goToRegister">Register</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const router = useRouter();

const login = () => {
  if (email.value && password.value) {
    // 로그인 처리 (여기서는 예시로 로그인을 콘솔에 출력)
    console.log('Logging in with:', email.value, password.value);

    // 로그인 성공 시 리디렉션
    router.push('/dashboard');  // 로그인 후 대시보드로 이동
  } else {
    console.log('Please enter email and password');
  }
};

const goToRegister = () => {
  router.push('/register');  // 등록 화면으로 이동
};
</script>

<style scoped>
.v-card {
  max-width: 400px;
  margin: auto;
}
</style>
