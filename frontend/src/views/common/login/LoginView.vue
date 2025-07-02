<template>
    <v-container class="d-flex justify-center align-center" style="height: 100vh;">
        <v-row class="d-flex justify-center" style="height: 100%;">
        <v-col cols="12" md="8">
            <v-card class="pa-4">
            <v-card-title class="justify-center mb-4">
                <span class="text-h6 font-weight-bold">로그인</span>
            </v-card-title>

            <v-card-text>
                <v-form @submit.prevent="login" ref="form">
                <v-text-field
                    ref="emailFieldRef"
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
                    ref="passwordFieldRef"
                    v-model="password"
                    label="비밀번호"
                    prepend-inner-icon="mdi-lock-outline"
                    required
                    :rules="passwordRules"
                    @blur="handlePasswordBlur"
                    class="mb-2"
                    :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    :type="showPassword ? 'text' : 'password'"
                    @click:append="showPassword = !showPassword"
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
                <v-btn text class="ml-1" @click="goToSignup">회원가입</v-btn>
            </v-card-actions>
            </v-card>
        </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import validation from '@/utils/common/validation'
import { commonFetch } from '@/utils/common/commonFetch';
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore();

const emailFieldRef = ref(null);
const passwordFieldRef = ref(null);

const showPassword = ref(false);

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
const route = useRoute();

const login = async () => {
    if (!email.value) {
        emailError.value = '이메일이 입력되지 않았습니다.';
        nextTick(() => {
            if (emailFieldRef.value && typeof emailFieldRef.value.validate === 'function') {
                emailFieldRef.value.validate();
            }
        });
        alert("이메일이 입력되지 않았습니다.", "error")
        return;
    }

    if (!validation.isEmail(email.value)) {
        emailError.value = '올바른 이메일 형식이 아닙니다.';
        nextTick(() => {
            if (emailFieldRef.value && typeof emailFieldRef.value.validate === 'function') {
                emailFieldRef.value.validate();
            }
        });
        alert("올바른 이메일 형식이 아닙니다.", "error")
        return;
    }

    if (!password.value) {
        passwordError.value = '비밀번호가 입력되지 않았습니다.';
        nextTick(() => {
            if (passwordFieldRef.value && typeof passwordFieldRef.value.validate === 'function') {
                passwordFieldRef.value.validate();
            }
        });
        alert("비밀번호가 입력되지 않았습니다.", "error")
        return;
    }

    if (email.value && password.value) {        
        // 로그인 성공 시 리디렉션
        try {
            const response = await commonFetch(`/api/auth/login`,
                {
                    method: 'POST',
                    body: {
                        email: email.value,
                        password: password.value,
                    },
                }
            );

            if (response.success) {
                console.log('로그인 성공');
                localStorage.setItem('token', response.data.token);
                userStore.setUser(response.data.user)
                if(!!!route.query.type) router.push('/');
                else{
                    if(route.query.type === "league-join" && !!route.query.code){
                        router.push(`/league/join?inviteCode=${route.query.code}`);
                    }else router.push('/');
                }
            } else {
                console.error('로그인 실패:', response);

                handleServerError(response);
            }
        } catch (error) {
            console.error('로그인 API 오류:', error);
            handleServerError(error);
        }
    }
};

const handleServerError = (error) => {
    switch(error.code){
        case -2 :
        case -3 :
            alert(error.message)
            break;
        case -4 :
        case -5 :
            alert("가입되지 않은 계정이거나 잘못된 비밀번호입니다.", "error")
            break;
        default :
            alert("로그인 과정에서 오류가 발생하였습니다.", "error")
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

const goToSignup = () => {
    router.push('/signup');  // 등록 화면으로 이동
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
