<template>
    <v-container>
        <v-card class="pa-4 mx-auto">
            <v-card-title class="text-h6 mb-4">
                {{ isEditMode ? '선수 정보 수정' : '선수 정보 등록' }}
            </v-card-title>

            <v-card-text>
                <v-form @submit.prevent="submitForm" ref="formRef" v-model="formValid">
                    <!-- 기본 정보 입력 -->
                    <v-text-field
                        v-model="form.name"
                        label="선수 이름"
                        :rules="[v => !!v || '이름을 입력해주세요.']"
                        required
                    />
                    <CommonDateInput
                        v-model="form.birth_date"
                        label="생년월일"
                        :max="today"
                        :rules="[v => !!v || '생년월일을 입력해주세요.']"
                        :required="true"
                    />

                    <v-select
                        v-model="form.player_type"
                        label="선수 유형"
                        :items="[
                            { label: '타자', value: 'B' }, 
                            { label: '투수', value: 'P' }
                        ]"
                        item-title="label"
                        item-value="value"
                        :rules="[v => !!v || '선수 유형을 선택해주세요.']"
                        required
                    />
                    <v-select
                        v-model="form.primary_position"
                        :items="filteredPositions"
                        label="주 포지션"
                        chips
                        item-title="name"
                        item-value="code"
                    />

                    <!-- 이력 목록 -->
                    <v-divider class="my-4" />
                    <v-row class="align-center mb-2">
                        <v-col cols="6">
                            <span class="text-subtitle-1 font-weight-medium">선수 이력</span>
                        </v-col>
                        <v-col cols="6" class="text-right">
                            <v-btn color="primary" class="mb-2" @click="addSeason">이력 추가</v-btn>
                        </v-col>
                    </v-row>                    
                    <v-row
                        v-for="(season, index) in form.seasons"
                        :key="index"
                    >
                        <v-col cols="2">
                            <v-select
                                v-model="season.year"
                                :items="yearOptions"
                                label="연도"
                                :rules="[v => !!v || '연도 입력은 필수입니다.']"
                                required
                                @update:model-value="updateSeasonYear(index, season.year)"
                            />
                        </v-col>
                        <v-col cols="3">
                            <v-select
                                v-model="season.team_id"
                                label="팀"
                                :items="teamOptionsPerSeason[index] || []"
                                item-title="name"
                                item-value="id"
                                :rules="[v => !!v || '팀 선택은 필수입니다.']"
                                required
                            />
                        </v-col>
                        <v-col cols="2">
                            <v-select
                                v-model="season.position"
                                :items="filteredPositions"
                                label="포지션"
                                multiple
                                chips
                                item-title="name"
                                item-value="code"
                                required
                                :rules="[v => !!v || '포지션 선택은 필수입니다.']"
                            />
                        </v-col>
                        <v-col cols="2">
                            <v-text-field
                                v-model="season.uniform_number"
                                label="등번호"
                                type="number"
                                required
                                :rules="[v => !!v || '등번호 입력은 필수입니다.']"
                            />
                        </v-col>
                        <v-col cols="2">
                            <v-checkbox
                                v-model="season.is_active"
                                label="활동"
                            />
                        </v-col>
                        <v-col cols="1">
                            <v-btn icon color="error" @click="removeSeason(index)">
                                <v-icon>mdi-delete</v-icon>
                            </v-btn>
                        </v-col>
                    </v-row>
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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CommonDateInput from '@/components/common/CommonDateInput.vue';
import { commonFetch } from '@/utils/common/commonFetch';
import { formatDate } from '@/utils/common/dateUtils.js';
import { POSITIONS } from '@/utils/code/code.js';

const route = useRoute();
const router = useRouter();
const formRef = ref(null);
const formValid = ref(false);

const playerId = computed(() => decodeURIComponent(route.query.playerId));
const isEditMode = computed(() => !!playerId.value);

// 연도 옵션: 1982년부터 현재 연도까지
const birthDateInput = ref('');
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1982 + 1 }, (_, i) => 1982 + i);

const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
const birthDateMenu = ref(false);

const form = ref({
    name: '',
    birth_date: '',
    player_type: '',
    primary_position: null,
    seasons: [],
});

watch(() => form.value.birth_date, (newVal) => {
    birthDateInput.value = formatDate(newVal);
});

const handleBirthDateBlur = () => {
    const digits = birthDateInput.value.replace(/[^\d]/g, '');
    if (digits.length === 8) {
        const yyyy = digits.slice(0, 4);
        const mm = digits.slice(4, 6);
        const dd = digits.slice(6, 8);
        form.value.birth_date = `${yyyy}-${mm}-${dd}`;
    } else {
        // 값이 불완전하면 form과 input 모두 초기화
        form.value.birth_date = '';
        birthDateInput.value = '';
    }
};

const filteredPositions = computed(() => {
    if (form.value.player_type === 'P') {
        return POSITIONS.filter(pos => pos.code === 'SP' || pos.code === 'RP');
    } else if (form.value.player_type === 'B') {
        return POSITIONS.filter(pos => !['SP', 'RP'].includes(pos.code));
    }
    return [];
});

watch(() => form.value.player_type, () => {
    const validPositions = filteredPositions.value.map(pos => pos.code);

    // ✅ 기존의 primary_position이 필터링된 포지션에 있으면 유지
    if (!validPositions.includes(form.value.primary_position)) {
        form.value.primary_position = null;
    }

    // ✅ 시즌에 있는 포지션들도 유효한 값만 남김
    form.value.seasons.forEach(season => {
        if (Array.isArray(season.position)) {
            season.position = season.position.filter(pos => validPositions.includes(pos));
        } else {
            if (!validPositions.includes(season.position)) {
                season.position = null;
            }
        }
    });
});

const teamOptionsPerSeason = ref([]); // 각 시즌마다 팀 옵션 리스트

const fetchTeamsByYear = async (year) => {
    const res = await commonFetch(`/api/admin/team/list?year=${year}`, { method: 'GET' });
    console.log(res.data)
    return res.success ? res.data.teamList : [];
};

const fetchAllTeamOptionsForSeasons = async () => {
    const promises = form.value.seasons.map(season => fetchTeamsByYear(season.year));
    const results = await Promise.all(promises);
    teamOptionsPerSeason.value = results;
};

const fetchPlayer = async () => {
    const res = await commonFetch(`/api/admin/player/${encodeURIComponent(playerId.value)}`, { method: 'GET' });
    if (res.success) {
        const { playerInfo, seasons } = res.data;
        form.value = { ...playerInfo, seasons };
        await fetchAllTeamOptionsForSeasons();
    }
};

onMounted(async () => {
    if (isEditMode.value) {
        await fetchPlayer();
    }
});

const addSeason = async () => {
    const newSeason = {
        year: new Date().getFullYear(),
        team_id: null,
        position: null,
        uniform_number: null,
        is_active: true,
    };
    form.value.seasons.push(newSeason);

    const teamList = await fetchTeamsByYear(newSeason.year);
    teamOptionsPerSeason.value.push(teamList);
};

const removeSeason = (index) => {
    form.value.seasons.splice(index, 1);
    teamOptionsPerSeason.value.splice(index, 1);
};

const updateSeasonYear = async (index, newYear) => {
    const teamList = await fetchTeamsByYear(newYear);
    teamOptionsPerSeason.value[index] = teamList;
    form.value.seasons[index].team_id = null; // 팀 초기화
};

const submitForm = async () => {
    if (!formRef.value?.validate()) return;

    const method = isEditMode.value ? 'PUT' : 'POST';
    const url = isEditMode.value
        ? `/api/admin/player/update/${playerId.value}`
        : '/api/admin/player/create';

    try {
        const res = await commonFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form.value),
        });

        if (res.success) {
            alert(isEditMode.value ? '선수 정보가 수정되었습니다.' : '선수 정보가 등록되었습니다.');
            router.push('/admin/player/management');
        } else {
            alert(res.message || '저장 실패', 'error');
        }
    } catch {
        alert('서버 오류가 발생했습니다.', 'error');
    }
};
</script>
