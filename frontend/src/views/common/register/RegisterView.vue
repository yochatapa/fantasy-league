<template>
    <v-container class="d-flex justify-center align-center" style="height: 100vh;">
        <v-row class="d-flex justify-center" style="height: 100%;">
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
                                :rules="emailRules"
                                @blur="handleEmailBlur"
                                class="mb-2"
                            />

                            <!-- 비밀번호 입력 -->
                            <v-text-field
                            v-model="password"
                            label="비밀번호"
                            :rules="passwordRules"
                            required
                            prepend-inner-icon="mdi-lock-outline"
                            :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                            :type="showPassword ? 'text' : 'password'"
                            @click:append="showPassword = !showPassword"
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
                            :rules="passwordConfirmRules"
                            required
                            prepend-inner-icon="mdi-lock-check-outline"
                            class="mb-2"
                            :append-icon="showPassword2 ? 'mdi-eye' : 'mdi-eye-off'"
                            :type="showPassword2 ? 'text' : 'password'"
                            @click:append="showPassword2 = !showPassword2"
                            />

                            <!-- 닉네임 입력 -->
                            <v-text-field
                                ref="nicknameFieldRef"
                                v-model="nickname"
                                label="닉네임"
                                required
                                :rules="nicknameRules"
                                :loading="isCheckingNickname"
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
import { ref, computed, watch, nextTick } from 'vue';
import { KBO_TEAMS } from '@/utils/code/kboTeams';
import validation from '@/utils/common/validation';

const nicknameFieldRef = ref(null);

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

const isCheckingNickname = ref(false); // 닉네임 중복 확인 API 호출 중인지 여부
// 닉네임 확인 결과 상태: null (초기/리셋), 'checking' (확인 중), 'available' (사용 가능), 'taken' (이미 사용 중), 'error' (API 오류)
const nicknameCheckStatus = ref(null);

const showPassword = ref(false);
const showPassword2 = ref(false);

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

const nicknameRules = computed(() => {
     const rules = [
        // 규칙 1: 필수 입력
        value => !!value || '필수 입력 항목입니다.',
        // 규칙 2: 특수 문자 불가
        value => {
             if (!value) return true;

             const specialCharRegex = /[^가-힣a-zA-Z0-9]/;

             if (specialCharRegex.test(value)) {
                 return '특수 문자는 사용할 수 없습니다.';
             }

             // 특수 문자가 발견되지 않으면 true 반환하여 이 규칙 통과
             return true;
         },
        // 규칙 3: 최소 길이
        value => (value && value.length >= 3 && value.length<=20) || '닉네임은 3자 이상, 20자 이하여야 합니다.',
        // 규칙 4: 비동기 중복 확인 상태에 따른 메시지
        () => {
             if (!nickname.value || nickname.value.length < 3 || nickname.value.length > 20) {
                  return true; // 길이가 짧으면 이 규칙은 통과시키고 앞 규칙이 에러를 표시
             }
             console.log(nicknameCheckStatus.value)
             switch (nicknameCheckStatus.value) {
                case 'taken':
                    return '이미 사용 중인 닉네임입니다.'; // 이미 사용 중이면 에러 메시지 반환
                case 'error':
                    return '닉네임 확인 중 오류가 발생했습니다.'; // API 오류 시 에러 메시지 반환
                case 'checking':
                case 'available':
                case null:
                default:
                    // '확인 중', '사용 가능', '확인 전' 상태는 에러가 아니므로 true 반환
                    return true;
             }
        }
    ];
    return rules;
});

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
const checkNicknameAvailability = async () => {
    // 입력 값이 없거나 너무 짧거나 이미 확인 중이면 API 호출하지 않음
    if (!nickname.value || nickname.value.length < 3 || isCheckingNickname.value) {
        return;
    }

    // 중복 확인 상태 초기화 및 확인 시작 표시
    nicknameCheckStatus.value = 'checking';
    isCheckingNickname.value = true; // 로딩 인디케이터 표시용

    try {
        const url = `${import.meta.env.VITE_API_URL}/api/users/check-nickname?nickname=${encodeURIComponent(nickname.value)}`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorDetail = await response.text(); // 또는 response.json()
            throw new Error(`HTTP error! status: ${response.status}, detail: ${errorDetail}`);
        }

        const data = await response.json();

        if (data.exists) {
            nicknameCheckStatus.value = 'taken'; // 이미 사용 중
        } else {
            nicknameCheckStatus.value = 'available'; // 사용 가능
        }

    } catch (error) {
        // 네트워크 오류나 위에서 throw 한 HTTP 에러가 여기서 잡힙니다.
        console.error('닉네임 중복 확인 API 오류:', error);
        nicknameCheckStatus.value = 'error'; // API 오류 또는 네트워크 오류 발생
    } finally {
        // 확인 완료 후 로딩 상태 해제
        isCheckingNickname.value = false;

        await nextTick();

        // nicknameFieldRef가 존재하고 유효성 검사 메서드가 있다면 호출합니다.
        // Vuetify 3의 v-text-field 컴포넌트 인스턴스는 validate() 메서드를 노출합니다.
        if (nicknameFieldRef.value && typeof nicknameFieldRef.value.validate === 'function') {
            // 해당 필드의 유효성 검사를 다시 실행합니다.
             nicknameFieldRef.value.validate();
        }
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
