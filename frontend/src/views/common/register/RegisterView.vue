<template>
    <v-container class="d-flex justify-center align-center" style="height: 100vh;">
        <v-row class="d-flex justify-center">
            <v-col cols="12" sm="8" md="4">
                <v-card class="pa-4">
                    <v-card-title class="justify-center mb-4">
                        <span class="text-h6 font-weight-bold">회원가입</span>
                    </v-card-title>

                    <v-card-text>
                        <v-form @submit.prevent="submitForm" ref="form">
                            <!-- 이메일 입력 -->
                            <v-text-field
                                v-model="email"
                                label="이메일"
                                type="email"
                                prepend-inner-icon="mdi-email-outline"
                                required
                                density="comfortable"
                                :rules="emailRules"
                                @blur="handleEmailBlur"
                                class="mb-2"
                            />

                            <!-- 비밀번호 입력 -->
                            <v-text-field
                            v-model="password"
                            label="비밀번호"
                            type="password"
                            :rules="passwordRules"
                            required
                            prepend-inner-icon="mdi-lock-outline"
                            class=""
                            />

                            <!-- 조건 체크 시각화 -->
                            <div class="text-caption mb-4" style="margin-left: 8px;">
                                <div :class="{ 'text-success': passwordValidationState.lengthValid, 'text-error': !passwordValidationState.lengthValid }">
                                    • 8자 이상 20자 이하
                                </div>
                                <div :class="{ 'text-success': passwordValidationState.numberValid, 'text-error': !passwordValidationState.numberValid }">
                                    • 숫자 포함
                                </div>
                                <div :class="{ 'text-success': passwordValidationState.specialCharValid, 'text-error': !passwordValidationState.specialCharValid }">
                                    • 특수문자 포함
                                </div>
                            </div>

                            <!-- 비밀번호 확인 필드 -->
                            <v-text-field
                            v-model="passwordConfirm"
                            label="비밀번호 확인"
                            type="password"
                            :rules="passwordConfirmRules"
                            required
                            prepend-inner-icon="mdi-lock-check-outline"
                            class="mb-2"
                            />

                            <!-- 닉네임 입력 -->
                            <v-text-field
                                v-model="nickname"
                                label="닉네임"
                                required
                                :rules="nicknameRules"
                                @blur="checkNicknameAvailability"
                                class="mb-2"
                            />

                            <!-- 프로필 이미지 -->
                            <v-file-input
                                v-model="profileImage"
                                label="프로필 이미지"
                                prepend-inner-icon="mdi-image-outline"
                                class="mb-2"
                                accept="image/*"
                            />

                            <!-- 프로필 소개글 -->
                            <v-textarea
                                v-model="profileBio"
                                label="프로필 소개글"
                                :rules="[bioRules]"
                                class="mb-2"
                            />

                            <!-- 선호 구단 선택 -->
                            <v-select
                                v-model="favoriteTeam"
                                :items="kboTeams"
                                label="선호 구단"
                                item-title="name"
                                item-value="key"
                                prepend-inner-icon="mdi-baseball"
                                class="mb-2"
                            />

                            <!-- 제출 버튼 -->
                            <v-btn color="primary" :disabled="!valid" block type="submit">
                                회원가입
                            </v-btn>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { KBO_TEAMS } from '@/utils/code/kboTeams';
import validation from '@/utils/common/validation';

const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const nickname = ref('');
const profileImage = ref('');
const profileBio = ref('');
const favoriteTeam = ref(null);

const emailError = ref('');
const passwordError = ref('');
const passwordConfirmError = ref('');
const nicknameError = ref('');

const kboTeams = Object.keys(KBO_TEAMS).map(key => ({
    key,
    name: KBO_TEAMS[key].name
}));

const emailRules = computed(() => [
    () => emailError.value === '' || emailError.value
]);

const passwordRules = computed(() => [
    () => passwordError.value === '' || passwordError.value
]);

const passwordConfirmRules = computed(() => [
  () => passwordConfirmError.value === '' || passwordConfirmError.value
]);

const nicknameRules = computed(() => [
    () => nicknameError.value === '' || nicknameError.value
]);

const valid = computed(() => {
  return (
    email.value &&
    password.value &&
    passwordConfirm.value &&
    nickname.value &&
    emailError.value === '' &&
    passwordError.value === '' &&
    passwordConfirmError.value === '' &&
    nicknameError.value === ''
  );
});

const bioRules = [
    v => v.length <= 255 || '소개글은 255자 이내로 입력해주세요.'
];

const passwordValidationState = ref({
  lengthValid: false,
  numberValid: false,
  specialCharValid: false,
  isAllValid: false,
});

watch(password, (val) => {
  const result = validation.isPassword(val);
  passwordValidationState.value = result;
  passwordError.value = result.isAllValid ? '' : '비밀번호 조건을 충족해주세요.';
  // 비밀번호 변경 시 확인값도 다시 체크
  if (passwordConfirm.value) {
    passwordConfirmError.value = passwordConfirm.value === val ? '' : '비밀번호가 일치하지 않습니다.';
  }
});

watch(passwordConfirm, (val) => {
  passwordConfirmError.value = val === password.value ? '' : '비밀번호가 일치하지 않습니다.';
});

// 이메일 검증
const handleEmailBlur = () => {
    if (!email.value) {
        emailError.value = '이메일을 입력해주세요.';
    } else if (!validation.isEmail(email.value)) {
        emailError.value = '올바른 이메일 형식이 아닙니다.';
    } else {
        emailError.value = '';
    }
};

// 비밀번호 확인 검증
const handleConfirmPasswordInput = () => {
    if (confirmPassword.value !== password.value) {
        confirmPasswordError.value = '비밀번호가 일치하지 않습니다.';
    } else {
        confirmPasswordError.value = '';
    }
};

// 닉네임 중복 검사
const checkNicknameAvailability = () => {
    // 서버에서 닉네임 중복 여부 확인하는 API 호출
    if (nickname.value.length < 3) {
        nicknameError.value = '닉네임은 3자 이상이어야 합니다.';
    } else {
        nicknameError.value = '';
        // 여기서 API로 닉네임 중복 체크를 할 수 있습니다.
    }
};

const submitForm = () => {
    if (!email.value || !password.value || !confirmPassword.value || !nickname.value) {
        console.log('입력값이 부족합니다.');
        return;
    }

    console.log('회원가입 데이터:', {
        email: email.value,
        password: password.value,
        nickname: nickname.value,
        profileImage: profileImage.value,
        profileBio: profileBio.value,
        favoriteTeam: favoriteTeam.value,
    });
    // TODO: API 호출로 백엔드에 데이터 전송 (회원가입 처리)
};
</script>

<style scoped>
.v-card {
  max-width: 400px;
  margin: auto;
}
</style>
