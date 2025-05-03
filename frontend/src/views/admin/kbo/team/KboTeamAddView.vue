<template>
    <v-container>
        <v-card class="pa-4 mx-auto">
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

                    <FileUploader
                        v-model="form.logo"
                        label="로고 이미지"
                        accept="image/*"
                        :initial-files="initialLogo ? initialLogo : []"
                        ref="fileUploader"
                        :multiple="false"
                        type="image"
                    />
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn :disabled="!formValid" color="primary" @click="submitForm">
                    {{ isEditMode ? '수정' : '등록' }}
                </v-btn>
                <v-btn v-if="isEditMode" color="primary" @click="deleteForm">
                    삭제
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { commonFetch } from '@/utils/common/commonFetch';
import FileUploader from '@/components/common/FileUploader.vue';

const route = useRoute();
const router = useRouter();

const teamId = computed(() => route.query.teamId);
const isEditMode = computed(() => !!teamId.value);
const currentYear = new Date().getFullYear();

const form = ref({
    name: '',
    code: '',
    founding_year: currentYear,
    disband_year: null,
    status: 'active',
    logo: null,
});

const initialLogo = ref(null);
const formRef = ref(null);
const formValid = ref(false);
const fileUploader = ref(null);

const statusOptions = [
    { label: '활성', value: 'active' },
    { label: '해체', value: 'inactive' },
];

const fetchTeam = async () => {
    try {
        const res = await commonFetch(`/api/admin/team/${encodeURIComponent(teamId.value)}`, {
            method: 'GET',
        });

        if (res.success) {
            const teamInfo = res.data.teamInfo;
            const logoInfo = res.data.logoInfo;

            form.value = {
                name: teamInfo.name,
                code: teamInfo.code,
                founding_year: teamInfo.founding_year,
                disband_year: teamInfo.disband_year,
                status: teamInfo.status,
            };

            if (logoInfo) {
                initialLogo.value = logoInfo
            }
        } else {
            alert(res.message, "error");
        }
    } catch (err) {
        router.push('/admin/team/management');
        alert("팀 정보 조회 과정에서 오류가 발생했습니다.", "error");
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
        if (form.value[key] !== null && key !== 'logo') {
            formData.append(key, form.value[key]??'');
        }
    }

    const newFiles = fileUploader.value?.getNewFiles() || [];
    newFiles.forEach(file => {
        formData.append('newFiles', file);
    });

    const deletedFiles = fileUploader.value?.getDeletedFiles() || [];
    formData.append('deletedFiles', JSON.stringify(deletedFiles));

    try {
        const res = await commonFetch(
            isEditMode.value
                ? `/api/admin/team/update/${encodeURIComponent(teamId.value)}`
                : '/api/admin/team/create',
            {
                method: isEditMode.value ? 'PUT' : 'POST',
                body: formData,
            }
        );

        if (res.success) {
            router.push('/admin/team/management');
            alert(isEditMode.value ? '팀 정보가 수정되었습니다!' : '팀 정보가 등록되었습니다!');
        } else {
            alert(res.message, "error");
        }
    } catch (err) {
        alert('서버에서 에러가 발생하였습니다.\n다시 시도해주세요.', "error");
    }
};

const deleteForm = async () => {
    if (!teamId.value) {
        alert('삭제할 팀이 존재하지 않습니다.'), "error";
        return;
    }

    const confirmed = await confirm('정말 이 팀을 삭제하시겠습니까?');

    if (!confirmed) return;

    try {
        const res = await commonFetch(
            `/api/admin/team/delete`,
            {
                method: 'DELETE',
                body : {
                    teamId : teamId.value
                }
            }
        );

        if (res.success) {
            router.push('/admin/team/management');
            alert('팀 정보가 삭제되었습니다.');
        } else {
            alert(res.message || '삭제에 실패했습니다.', "error");
        }
    } catch (err) {
        alert('서버 오류가 발생했습니다.\n다시 시도해주세요.', "error");
    }
};

</script>

<style scoped>
.max-w-xl {
    max-width: 600px;
}
</style>