<template>
    <v-container class="d-flex justify-center align-center" style="height: 100vh;">
        <v-row class="d-flex justify-center" style="height: 100%;">
            <v-col cols="12" sm="8" md="6">
                <v-card class="pa-4">
                    <v-card-title class="justify-center mb-4">
                        <span class="text-h6 font-weight-bold">회원가입</span>
                    </v-card-title>

                    <v-card-text>
                        <v-form @submit.prevent="submitForm" ref="form">
                            <!-- 이메일 입력 -->
                            <v-text-field
                                ref="emailFieldRef"
                                v-model="email"
                                label="이메일"
                                type="email"
                                prepend-inner-icon="mdi-email-outline"
                                required
                                :rules="emailRules"
                                :loading="isCheckingEmail"
                                @blur="handleEmailBlur"
                                class="mb-2"
                            />

                            <!-- 비밀번호 입력 -->
                            <v-text-field
                                ref="passwordFieldRef"
                                v-model="password"
                                label="비밀번호"
                                :rules="passwordRules"
                                required
                                prepend-inner-icon="mdi-lock-outline"
                                :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                                :type="showPassword ? 'text' : 'password'"
                                @click:append="showPassword = !showPassword"
                                class="mb-1"
                                maxlength="20"
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
                                ref="passwordConfirmFieldRef"
                                v-model="passwordConfirm"
                                label="비밀번호 확인"
                                :rules="passwordConfirmRules"
                                required
                                prepend-inner-icon="mdi-lock-check-outline"
                                class="mb-2"
                                :append-icon="showPassword2 ? 'mdi-eye' : 'mdi-eye-off'"
                                :type="showPassword2 ? 'text' : 'password'"
                                @click:append="showPassword2 = !showPassword2"
                                maxlength="20"
                            />

                            <!-- 닉네임 입력 -->
                            <v-text-field
                                ref="nicknameFieldRef"
                                v-model="nickname"
                                label="닉네임"
                                required
                                :rules="nicknameRules"
                                :loading="isCheckingNickname"
                                @blur="handleNicknameBlur"
                                class="mb-2"
                                maxlength="20"
                            />

                            <!-- 프로필 이미지 -->
                            <FileUploader
                                v-model="profileImage"
                                label="프로필 이미지"
                                accept="image/*"
                                :multiple="false"
                                type="image"
                                class="mb-2"
                            />

                            <!-- 프로필 소개글 -->
                            <v-textarea
                                v-model="profileBio"
                                label="프로필 소개글"
                                :rules="bioRules"
                                class="mb-2"
                                maxlength="255"
                                counter
                                no-resize
                                auto-grow
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
import { commonFetch, getNewFormData } from '@/utils/common/commonFetch';
import { useRouter } from 'vue-router';
import FileUploader from '@/components/common/FileUploader.vue';

const router = useRouter();

const emailFieldRef = ref(null);
const passwordFieldRef = ref(null);
const passwordConfirmFieldRef = ref(null);
const nicknameFieldRef = ref(null);

const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const nickname = ref('');
const profileImage = ref([]);
const profileBio = ref('');
const favoriteTeam = ref(null);

const passwordError = ref('');
const passwordConfirmError = ref('');

const isCheckingEmail = ref(false); // 이메일 중복 확인 API 호출 중인지 여부
// 이메일 확인 결과 상태: null (초기/리셋), 'checking' (확인 중), 'available' (사용 가능), 'taken' (이미 사용 중), 'error' (API 오류)
const emailCheckStatus = ref(null);
const isCheckingNickname = ref(false); // 닉네임 중복 확인 API 호출 중인지 여부
// 닉네임 확인 결과 상태: null (초기/리셋), 'checking' (확인 중), 'available' (사용 가능), 'taken' (이미 사용 중), 'error' (API 오류)
const nicknameCheckStatus = ref(null);

const showPassword = ref(false);
const showPassword2 = ref(false);

const kboTeams = Object.keys(KBO_TEAMS).map(key => ({
    key,
    name: KBO_TEAMS[key].name
}));

const emailRules = computed(() => {
    const rules = [
        // 규칙 1: 필수 입력
        value => !!value || '필수 입력 항목입니다.',
        // 규칙 2: 특수 문자 불가
        value => {
            if (!value) return true;
             
            if (!validation.isEmail(email.value)) {
                return '올바른 이메일 형식이 아닙니다.';
            }

            return true;
        },
        // 규칙 3: 비동기 중복 확인 상태에 따른 메시지
        () => {
            if (!email.value || !validation.isEmail(email.value)) {
                return true; // 길이가 짧으면 이 규칙은 통과시키고 앞 규칙이 에러를 표시
            }
            
            switch (emailCheckStatus.value) {
                case 'taken':
                    return '이미 사용 중인 이메일입니다.'; // 이미 사용 중이면 에러 메시지 반환
                case 'error':
                    return '이메일 확인 중 오류가 발생했습니다.'; // API 오류 시 에러 메시지 반환
                case 'server':
                    return '회원가입 중 문제가 발생했습니다. 다시 시도해주세요.'; // API 오류 시 에러 메시지 반환
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

            if (!validation.isNickname(value)) {
                return '닉네임에는 한글, 영문, 숫자, 마침표(.), 밑줄(_)만 사용할 수 있습니다.';
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
            
            switch (nicknameCheckStatus.value) {
                case 'taken':
                    return '이미 사용 중인 닉네임입니다.'; // 이미 사용 중이면 에러 메시지 반환
                case 'error':
                    return '닉네임 확인 중 오류가 발생했습니다.'; // API 오류 시 에러 메시지 반환
                case 'server':
                    return '회원가입 중 문제가 발생했습니다. 다시 시도해주세요.'; // API 오류 시 에러 메시지 반환
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
        validation.isEmail(email.value) &&
        password.value &&
        validation.isPassword(password.value).isAllValid &&
        passwordConfirm.value &&
        nickname.value &&
        passwordError.value === '' &&
        passwordConfirmError.value === '' &&
        emailCheckStatus.value === 'available' && // 이메일 중복 확인이 완료되지 않으면 비활성화
        nicknameCheckStatus.value === 'available' // 닉네임 중복 확인이 완료되지 않으면 비활성화
    );
});

const bioRules = [
    v =>  v.length <= 255 || '소개글은 255자까지 입력 가능합니다.'
];

const passwordValidationState = ref({
  lengthValid: false,
  numberValid: false,
  specialCharValid: false,
  isAllValid: false,
});

watch(email, (newVal) => {
    if (!newVal || !validation.isEmail(newVal)) {
        emailCheckStatus.value = null;
    } else {
        emailCheckStatus.value = null;
    }
});

watch(password, (val) => {
    const result = validation.isPassword(val);
    passwordValidationState.value = result;
    passwordError.value = result.isAllValid ? '' : '비밀번호 조건을 충족해주세요.';
    // 비밀번호 변경 시 확인값도 다시 체크
    if (passwordConfirm.value) {
        passwordConfirmError.value = passwordConfirm.value === val ? '' : '비밀번호가 일치하지 않습니다.';
        nextTick(() => {
            if (passwordConfirmFieldRef.value && typeof passwordConfirmFieldRef.value.validate === 'function') {
                passwordConfirmFieldRef.value.validate(); // 이메일 유효성 검증
            }
        });
    }
});

watch(passwordConfirm, (val) => {
    passwordConfirmError.value = val === password.value ? '' : '비밀번호가 일치하지 않습니다.';
});

watch(nickname, (newVal) => {
  // 길이가 짧으면 상태 초기화
  if (!newVal || newVal.length < 3 || nickname.value.length > 20) {
    nicknameCheckStatus.value = null;
  } else {
    // 값이 바뀌었으므로, 이전 확인 결과는 무효
    nicknameCheckStatus.value = null;
  }
});

// 이메일 검증
const handleEmailBlur = async () => {
    // 입력 값이 없거나 너무 짧거나 이미 확인 중이면 API 호출하지 않음
    if (!email.value || !validation.isEmail(email.value)) {
        return;
    }

    // 중복 확인 상태 초기화 및 확인 시작 표시
    emailCheckStatus.value = 'checking';
    isCheckingEmail.value = true; // 로딩 인디케이터 표시용

    const url = `/api/users/check-email?email=${encodeURIComponent(email.value)}`;
    isCheckingEmail.value = true;

    const result = await commonFetch(url);

    if (result.success) {
        emailCheckStatus.value = result.data.exists ? 'taken' : 'available';
    } else {
        console.error('이메일 중복 확인 API 오류:', result.error);
        emailCheckStatus.value = 'error';
    }

    isCheckingEmail.value = false;

    await nextTick();
    if (emailFieldRef.value && typeof emailFieldRef.value.validate === 'function') {
        emailFieldRef.value.validate();
    }
};

// 닉네임 중복 검사
const handleNicknameBlur = async () => {
    // 입력 값이 없거나 너무 짧거나 이미 확인 중이면 API 호출하지 않음
    if (!nickname.value || nickname.value.length < 3 || isCheckingNickname.value) {
        return;
    }

    // 중복 확인 상태 초기화 및 확인 시작 표시
    nicknameCheckStatus.value = 'checking';
    isCheckingNickname.value = true; // 로딩 인디케이터 표시용

    const url = `/api/users/check-nickname?nickname=${encodeURIComponent(nickname.value)}`;
    isCheckingNickname.value = true;

    const result = await commonFetch(url);

    if (result.success) {
        nicknameCheckStatus.value = result.data.exists ? 'taken' : 'available';
    } else {
        console.error('닉네임 중복 확인 API 오류:', result.error);
        nicknameCheckStatus.value = 'error';
    }

    isCheckingNickname.value = false;

    await nextTick();

    if (nicknameFieldRef.value && typeof nicknameFieldRef.value.validate === 'function') {
        nicknameFieldRef.value.validate();
    }
};

const submitForm = async () => {
    if(!email.value) return alert("이메일이 입력되지 않았습니다.", "error")
    if(!validation.isEmail(email.value)) return alert("올바른 이메일 형식이 아닙니다.", "error")
    if(emailCheckStatus.value === "taken") return alert("이미 사용 중인 이메일입니다.", "error")

    if(!password.value) return alert("비밀번호가 입력되지 않았습니다.", "error")
    if(!validation.isPassword(password.value).isAllValid) return alert("비밀번호 조건을 충족해주세요.", "error")
    if(password.value !== passwordConfirm.value) return alert("비밀번호가 일치하지 않습니다.", "error")

    if(!nickname.value) return alert("닉네임이 입력되지 않았습니다.", "error")
    if(!validation.isNickname(nickname.value)) return alert("닉네임에는 한글, 영문, 숫자, 마침표(.), 밑줄(_)만 사용할 수 있습니다.", "error")
    if(nicknameCheckStatus.value === "taken") return alert("비밀번호가 일치하지 않습니다.", "error")

    try {
        const formData = getNewFormData({
            email : email.value
            , password : password.value
            , nickname : nickname.value
            , profileBio : profileBio.value
            , favoriteTeam : favoriteTeam.value
            , profileImage : profileImage.value
        });

        const response = await commonFetch(`/api/users/signup`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (response.success) {
            console.log('회원가입 성공:', response);
            alert("가입을 환영합니다!\n지금 바로 로그인해서 서비스를 시작해보세요.");
            router.push('/login');
        } else {
            console.error('회원가입 실패:', response);

            handleServerError(response);
        }
    } catch (error) {
        console.error('회원가입 API 오류:', error);
        handleServerError(error);
    }
};

// 서버 오류 처리
const handleServerError = (error) => {
     if (error.code === -3) {
        // 이메일 오류 처리
        emailCheckStatus.value = 'taken'; // 이메일 서버 오류 상태 설정
        nextTick(() => {
            if (emailFieldRef.value && typeof emailFieldRef.value.validate === 'function') {
                emailFieldRef.value.validate();
            }
        });
        alert("이미 사용 중인 이메일입니다.");
    }else if (error.code === -4) {
        // 닉네임 오류 처리
        nicknameCheckStatus.value = 'taken'; // 닉네임 서버 오류 상태 설정
        nextTick(() => {
            if (nicknameFieldRef.value && typeof nicknameFieldRef.value.validate === 'function') {
                nicknameFieldRef.value.validate();
            }
        });
        alert("이미 사용 중인 닉네임입니다.");
    }else if (error.code === -1) {
        alert("회원가입 중 문제가 발생했습니다.\n다시 시도해주세요.");
        /*emailCheckStatus.value = 'server'; // 이메일 서버 오류 상태 설정
        nicknameCheckStatus.value = 'server'; // 닉네임 서버 오류 상태 설정
        passwordError.value = '회원가입 중 문제가 발생했습니다. 다시 시도해주세요.';
        passwordConfirmError.value = '회원가입 중 문제가 발생했습니다. 다시 시도해주세요.';
        nextTick(() => {
            if (emailFieldRef.value && typeof emailFieldRef.value.validate === 'function') {
                emailFieldRef.value.validate();
            }

            if (passwordFieldRef.value && typeof passwordFieldRef.value.validate === 'function') {
                passwordFieldRef.value.validate();
            }

            if (passwordConfirmFieldRef.value && typeof passwordConfirmFieldRef.value.validate === 'function') {
                passwordConfirmFieldRef.value.validate();
            }

            if (nicknameFieldRef.value && typeof nicknameFieldRef.value.validate === 'function') {
                nicknameFieldRef.value.validate();
            }
        });*/
    }
};
</script>
