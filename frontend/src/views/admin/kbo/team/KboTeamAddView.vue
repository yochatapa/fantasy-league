<template>
    <v-container>
        <v-card class="pa-4 mx-auto max-w-xl">
            <v-card-title class="text-h6 mb-4">
                {{ isEditMode ? 'KBO 팀 수정' : 'KBO 팀 추가' }}
            </v-card-title>
            <v-card-text>
                <v-form @submit.prevent="submitForm" ref="formRef" v-model="formValid">
                    <v-text-field
                        v-model="form.name"
                        label="팀명"
                        :rules="[v => !!v || '팀명을 입력해주세요.']"
                        required
                    />
                    <v-text-field
                        v-model="form.code"
                        label="팀 코드"
                        :rules="[v => !!v || '코드를 입력해주세요.']"
                        required
                    />
                    <v-text-field
                        v-model="form.founding_year"
                        label="창단년도"
                        type="number"
                        :rules="[v => !!v || '창단년도를 입력해주세요.']"
                        required
                    />
                    <v-text-field
                        v-model="form.disband_year"
                        label="해체년도 (선택)"
                        type="number"
                    />
                    <v-select
                        v-model="form.status"
                        label="상태"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        :rules="[v => !!v || '상태를 선택해주세요.']"
                        required
                    />
                    <v-file-input
                        v-model="form.logo"
                        label="로고 이미지"
                        accept="image/*"
                        prepend-icon="mdi-image"
                    />
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn :disabled="!formValid" color="primary" @click="submitForm">
                    {{ isEditMode ? '수정' : '등록' }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { commonFetch } from '@/utils/common/commonFetch';

const route = useRoute();
const router = useRouter();

const id = computed(() => route.query.id);
const isEditMode = computed(() => !!id.value);

const currentYear = new Date().getFullYear();

const form = ref({
    name: '',
    code: '',
    founding_year: currentYear,
    disband_year: null,
    status: 'active',
    logo: null,
});

const formRef = ref(null);
const formValid = ref(false);

const statusOptions = [
    { label: '활성', value: 'active' },
    { label: '해체', value: 'inactive' },
];

const fetchTeam = async () => {
    try {
        const res = await fetch(`/api/teams/${id.value}`);
        if (!res.ok) throw new Error('팀 정보를 불러오지 못했습니다.');
        const data = await res.json();
        form.value = {
            name: data.name,
            code: data.code,
            founding_year: data.founding_year,
            disband_year: data.disband_year,
            status: data.status,
            logo: null, // 수정 시 로고는 별도로 업로드
        };
    } catch (err) {
        alert(err.message);
        router.push('/teams'); // 잘못된 ID 접근 시 목록으로
    }
};

onMounted(() => {
    if (isEditMode.value) {
        fetchTeam();
    }
});

const submitForm = async () => {
    if (!formRef.value?.validate()) return;

    const formData = new FormData();
    for (const key in form.value) {
        if (form.value[key] !== null) {
            formData.append(key, form.value[key]);
        }
    }

    try {
        const res = await commonFetch(isEditMode.value ? `/api/admin/team/update/${id.value}` : '/api/admin/team/create', {
            method: isEditMode.value ? 'PUT' : 'POST',
            body: formData,
        });

        if (res.success){
            router.push('/admin/team/management');
            alert(isEditMode.value ? '팀 정보가 수정되었습니다!' : '팀 정보가 등록되었습니다!');
        }else{
            alert(res.message);
        }
    } catch (err) {
        alert('서버에서 에러가 발생하였습니다.\n 다시 시도해주세요.');
    }
};
</script>

<style scoped>
.max-w-xl {
    max-width: 600px;
}
</style>
