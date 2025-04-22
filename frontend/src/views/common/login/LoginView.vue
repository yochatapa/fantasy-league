<template>
    <v-container class="d-flex justify-center align-center" style="height: 100vh;">
        <v-row class="d-flex justify-center" style="height: 100%;">
        <v-col cols="12" sm="8" md="4">
            <v-card class="pa-4">
            <v-card-title class="justify-center mb-4">
                <span class="text-h6 font-weight-bold">로그인</span>
            </v-card-title>

            <v-card-text>
                <v-form @submit.prevent="login" ref="form">
                <v-text-field
                    v-model="email"
                    label="이메일"
                    type="email"
                    prepend-inner-icon="mdi-email-outline"
                    required
                    :rules="emailRules"
                    @blur="handleEmailBlur"
                    class="mb-2"
                />
                <v-text-field
                    v-model="password"
                    label="비밀번호"
                    type="password"
                    prepend-inner-icon="mdi-lock-outline"
                    required
                    :rules="passwordRules"
                    @blur="handlePasswordBlur"
                    class="mb-2"
                />
                <v-btn color="primary" type="submit" block class="mt-2">
                    로그인
                </v-btn>
                </v-form>
            </v-card-text>

            <v-card-actions class="justify-space-around px-4">
                <v-btn text @click="goToFindId" class="text-caption">아이디 찾기</v-btn>
                <v-btn text @click="goToFindPassword" class="text-caption">비밀번호 찾기</v-btn>
            </v-card-actions>

            <v-divider class="mt-2 mb-4" />

            <v-card-actions class="justify-center ">
                <!-- Google 로그인 버튼 -->
                <v-btn 
                    :style="{ backgroundColor: '#4285F4', border: '2px solid #4285F4' }"
                    @click="loginWithGoogle" 
                    block 
                    class="d-flex align-center justify-center py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                    <v-icon start class="mr-2" size="24" color="white">mdi-google</v-icon>
                    <span class="text-body-1 font-weight-bold text-white">Google 로그인</span>
                </v-btn>
            </v-card-actions>

            <v-card-actions class="justify-center">
                <!-- Kakao 로그인 버튼 -->
                <v-btn 
                    :style="{ backgroundColor: '#F7E300', border: '2px solid #F7E300' }"
                    @click="loginWithKakao" 
                    block 
                    class="d-flex align-center justify-center py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                    <v-icon start class="mr-2" size="24">mdi-chat</v-icon>
                    <span class="text-body-1 font-weight-bold text-dark">Kakao 로그인</span>
                </v-btn>
            </v-card-actions>

            <v-card-actions class="justify-center">
                <span class="text-caption">계정이 없으신가요?</span>
                <v-btn text class="ml-1" @click="goToRegister">회원가입</v-btn>
            </v-card-actions>
            </v-card>
        </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import validation from '@/utils/common/validation'

const emailError = ref('');

const emailRules = computed(() => [
  () => emailError.value === '' || emailError.value
]);

const passwordError = ref('');

const passwordRules = computed(() => [
  () => passwordError.value === '' || passwordError.value
]);

const email = ref('');
const password = ref('');
const router = useRouter();

const login = () => {
    if (!email.value) {
        emailError.value = '이메일이 입력되지 않았습니다.';
        return;
    }

    if (!validation.isEmail(email.value)) {
        emailError.value = '올바른 이메일 형식이 아닙니다.';
        return;
    }

    if (email.value && password.value) {
        // 로그인 처리 (여기서는 예시로 로그인을 콘솔에 출력)
        console.log('Logging in with:', email.value, password.value);
        emailValidationYn.value = false;
        // 로그인 성공 시 리디렉션
        //router.push('/dashboard');  // 로그인 후 대시보드로 이동
    } else {
        console.log('Please enter email and password');
    }
};

const handleEmailBlur = () => {
    
    if (!email.value) {
        emailError.value = '이메일이 입력되지 않았습니다.';
    } else if (!validation.isEmail(email.value)) {
        emailError.value = '올바른 이메일 형식이 아닙니다.';
    } else {
        emailError.value = '';
    }
};

const handlePasswordBlur = () => {
    
    if (!password.value) {
        passwordError.value = '비밀번호가 입력되지 않았습니다.';
    } else {
        passwordError.value = '';
    }
};

function required (v) {
    return !!v || 'Field is required'
}

const goToRegister = () => {
    router.push('/register');  // 등록 화면으로 이동
};

const goToFindId = () => {
  // 아이디 찾기 페이지 이동
}

const goToFindPassword = () => {
  // 비밀번호 찾기 페이지 이동
}

const loginWithGoogle = () => {
  // Google SSO
}

const loginWithKakao = () => {
  // Kakao SSO
}
</script>

<style scoped>
.v-card {
  max-width: 400px;
  margin: auto;
}
</style>
