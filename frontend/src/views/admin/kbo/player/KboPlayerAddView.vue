<template>
    <v-container>
        <v-card class="pa-4 mx-auto">
            <v-card-title class="text-h6 mb-4 font-weight-bold">
                {{ isEditMode ? '선수 정보 수정' : '선수 정보 등록' }}
            </v-card-title>
            
            <v-card-text>
                <v-form @submit.prevent="submitForm" ref="formRef" v-model="formValid">
                    <v-row no-gutters>
                        <v-col cols="12" class="mb-4">
                            <span class="text-h6">선수 기본 정보</span>
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-text-field
                                v-model="form.name"
                                label="선수 이름"
                                :rules="[v => !!v || '이름을 입력해주세요.']"
                                required
                            />
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <CommonDateInput
                                v-model="form.birth_date"
                                label="생년월일"
                                :max="today"
                                :rules="[v => !!v || '생년월일을 입력해주세요.']"
                                :required="true"
                            />
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-select
                                v-model="form.player_type"
                                label="선수 유형"
                                :items="[ { label: '타자', value: 'B' }, { label: '투수', value: 'P' } ]"
                                item-title="label"
                                item-value="value"
                                :rules="[v => !!v || '선수 유형을 선택해주세요.']"
                                required
                            />
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-select
                                v-model="form.primary_position"
                                :items="filteredPositions"
                                label="주 포지션"
                                item-title="name"
                                item-value="code"
                                :rules="[v => !!v || '주 포지션을 선택해주세요.']"
                                required
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="my-4" />

                    <v-row no-gutters>
                        <v-col cols="12" class="mb-4">
                            <span class="text-h6">프로필 이미지</span>
                        </v-col>
                        <v-col cols="12" class="pa-2">
                            <FileUploader
                                ref="mainImageUploader"
                                v-model="form.main_profile_image"
                                label="대표 이미지"
                                accept="image/*"
                                :multiple="false"
                                type="image"
                                :initial-files="initialMainProfileImage ? initialMainProfileImage : []"
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="my-4" />

                    <v-row no-gutters>
                        <v-col cols="12" class="mb-4">
                            <span class="text-h6">신체 정보</span>
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-text-field
                                v-model="form.height"
                                label="신장 (cm)"
                                type="number"
                                :rules="[v => !v || /^\d{1,3}$/.test(v) || '최대 3자리 숫자만 입력 가능합니다.']"
                                @input="form.height = form.height.replace(/[^0-9]/g, '').slice(0, 3)"
                            />
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-text-field
                                v-model="form.weight"
                                label="체중 (kg)"
                                type="number"
                                :rules="[v => !v || /^\d{1,3}$/.test(v) || '최대 3자리 숫자만 입력 가능합니다.']"
                                @input="form.weight = form.weight.replace(/[^0-9]/g, '').slice(0, 3)"
                            />
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-select
                                v-model="form.throwing_hand"
                                label="던지는 팔"
                                :items="[ { label: '우투', value: 'R' }, { label: '좌투', value: 'L' }, { label: '양투', value: 'B' } ]"
                                item-title="label"
                                item-value="value"
                            />
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-select
                                v-model="form.batting_hand"
                                label="치는 팔"
                                :items="[ { label: '우타', value: 'R' }, { label: '좌타', value: 'L' }, { label: '양타', value: 'B' } ]"
                                item-title="label"
                                item-value="value"
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="my-4" />

                    <v-row no-gutters>
                        <v-col cols="12" class="mb-4">
                            <span class="text-h6">계약 정보</span>
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-text-field
                                v-model="form.draft_info"
                                label="드래프트 정보"
                            />
                        </v-col>
                        <v-col cols="12" md="6" class="pa-2">
                            <v-text-field
                                v-model="form.contract_bonus"
                                label="입단 계약금 (만원)"
                                type="number"
                            />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-checkbox
                                v-model="form.is_retired"
                                label="은퇴 여부"
                            />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-checkbox
                                v-model="form.is_foreign"
                                label="외국인 선수 여부"
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="my-4" />

                    <v-container>
                        <v-row class="align-center mb-4">
                            <v-col cols="6">
                                <span class="text-h6">선수 이력</span>
                            </v-col>
                            <v-col cols="6" class="text-right">
                                <v-btn color="primary" class="mb-2" @click="addSeason">이력 추가</v-btn>
                            </v-col>
                        </v-row>

                        <v-row
                            v-for="(season, index) in activeSeasons"
                            :key="index"
                            no-gutters
                            class="d-flex flex-wrap align-items-center"
                        >
                            <v-col cols="12" md="2" class="px-2">
                                <v-select
                                    v-model="season.year"
                                    :items="yearOptions"
                                    label="연도"
                                    required
                                />
                            </v-col>
                            <v-col cols="12" md="3" class="px-2">
                                <v-select
                                    v-model="season.team_id"
                                    label="팀"
                                    :items="teamOptionsPerSeason[index] || []"
                                    item-title="name"
                                    item-value="id"
                                    required
                                />
                            </v-col>
                            <v-col cols="12" md="3" class="px-2">
                                <v-select
                                    v-model="season.position"
                                    :items="filteredPositions"
                                    label="포지션"
                                    multiple
                                    chips
                                    item-title="name"
                                    item-value="code"
                                    required
                                />
                            </v-col>
                            <v-col cols="12" md="2" class="px-2">
                                <v-text-field
                                    v-model="season.uniform_number"
                                    label="등번호"
                                    type="number"
                                    :rules="[v => !v || /^\d{1,3}$/.test(v) || '최대 3자리 숫자만 입력 가능합니다.']"
                                    @input="season.uniform_number = season.uniform_number.replace(/[^0-9]/g, '').slice(0, 3)"
                                    required
                                />
                            </v-col>
                            <v-col cols="12" md="2" class="px-2">
                                <v-select
                                    v-model="season.contract_type"
                                    label="계약 형태"
                                    :items="[
                                        { label: '일반 계약', value: 'C' },
                                        { label: 'FA', value: 'FA' },
                                        { label: '드래프트', value: 'D' },
                                        { label: '트레이드', value: 'T' },
                                        { label: '해외 영입', value: 'I' }
                                    ]"
                                    item-title="label"
                                    item-value="value"
                                />
                            </v-col>
                            <v-col cols="12" md="3" class="px-2">
                                <v-text-field
                                    v-model="season.salary"
                                    label="연봉 (만원)"
                                    type="number"
                                />
                            </v-col>
                            <v-col cols="12" md="3" class="px-2">
                                <CommonDateInput
                                    v-model="season.start_date"
                                    label="계약 시작일"
                                    :min="seasonStartEndDateOptions[index]?.minDate"
                                    :max="seasonStartEndDateOptions[index]?.maxDate"
                                    :default="seasonStartEndDateOptions[index]?.defaultStartDate"
                                />
                            </v-col>
                            <v-col cols="12" md="3" class="px-2">
                                <CommonDateInput
                                    v-model="season.end_date"
                                    label="계약 종료일"
                                    :min="seasonStartEndDateOptions[index]?.minDate"
                                    :max="seasonStartEndDateOptions[index]?.maxDate"
                                    :default="seasonStartEndDateOptions[index]?.defaultEndDate"
                                />
                            </v-col>
                            <v-col cols="12" md="2" class="px-2">
                                <v-checkbox
                                    v-model="season.is_active"
                                    label="1군 등록 여부"
                                />
                            </v-col>
                            <v-col cols="12" md="1" class="d-flex justify-end">
                                <v-btn icon color="error" @click="removeSeason(index)">
                                    <v-icon>mdi-delete</v-icon>
                                </v-btn>
                            </v-col>
                            <v-col cols="12" class="pa-2">
                                <FileUploader
                                    ref="seasonImageUploader"
                                    v-model="season.profile_image"
                                    label="시즌 이미지"
                                    accept="image/*"
                                    :multiple="false"
                                    type="image"
                                    :initial-files="initialSeasonImages[index] ? initialSeasonImages[index] : []"
                                />
                            </v-col>
                            <v-divider class="my-4"></v-divider>
                        </v-row>
                    </v-container>
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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';

import CommonDateInput from '@/components/common/CommonDateInput.vue';
import FileUploader from '@/components/common/FileUploader.vue';
import { commonFetch, getNewFormData } from '@/utils/common/commonFetch';
import { POSITIONS } from '@/utils/code/code.js';

const route = useRoute();
const router = useRouter();
const formRef = ref(null);
const formValid = ref(false);

const playerId = computed(() => route.query.playerId);
const isEditMode = computed(() => !!playerId.value);
const isInitialLoad = ref(true);

const mainImageUploader = ref(null);
const seasonImageUploader = ref(null);

const currentYear = dayjs().year();
const yearOptions = Array.from({ length: currentYear - 1982 + 1 }, (_, i) => 1982 + i);

const today = dayjs().format('YYYY-MM-DD');

const form = ref({
    name: '',
    birth_date: '',        // 'YYYY.MM.DD' 문자열로 관리
    player_type: null,
    primary_position: null,
    is_retired: false,
    draft_info: '',
    throwing_hand: null,
    batting_hand: null,
    height: null,
    weight: null,
    contract_bonus: null,
    is_foreign: false,
    main_profile_image: null, 
    seasons: [],
});

const initialMainProfileImage = ref(null);
const initialSeasonImages = ref([]);

const getFirstDayOfYear = (year) => `${year}.01.01`;
const getLastDayOfYear = (year) => `${year}.12.31`;

const activeSeasons = computed(() => form.value.seasons.filter(season => season.flag === 'I' || season.flag === 'U'));

const seasonStartEndDateOptions = computed(() => {
    return form.value.seasons.map(season => {
        const year = season.year || dayjs().year();
        return {
            minDate: getFirstDayOfYear(year),
            maxDate: getLastDayOfYear(year),
            defaultStartDate: getFirstDayOfYear(year),
            defaultEndDate: getLastDayOfYear(year),
        };
    });
});

const filteredPositions = computed(() => {
    if (form.value.player_type === 'P') {
        return POSITIONS.filter(pos => ['SP', 'RP'].includes(pos.code));
    } else if (form.value.player_type === 'B') {
        return POSITIONS.filter(pos => !['SP', 'RP'].includes(pos.code));
    }
    return [];
});

watch(() => form.value.player_type, () => {
    const validPositions = filteredPositions.value.map(pos => pos.code);

    if (!validPositions.includes(form.value.primary_position)) {
        form.value.primary_position = null;
    }

    form.value.seasons.forEach(season => {
        if (Array.isArray(season.position)) {
            season.position = season.position.filter(pos => validPositions.includes(pos));
        } else if (!validPositions.includes(season.position)) {
            season.position = null;
        }
    });
});

const teamOptionsPerSeason = ref([]);

const fetchTeamsByYear = async (year) => {
    const res = await commonFetch(`/api/admin/team/list?year=${year}`, { method: 'GET' });
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
        const { playerInfo, seasons, mainProfileImage, seasonImages } = res.data;

        // birth_date: ISO 문자열 → 'YYYY.MM.DD' 포맷 변환
        const birthDateFormatted = playerInfo.birth_date ? dayjs(playerInfo.birth_date).format('YYYY.MM.DD') : '';

        form.value = {
            ...playerInfo,
            birth_date: birthDateFormatted,
            main_profile_image: mainProfileImage ? [mainProfileImage] : null,
            seasons: seasons.map((season, index) => ({
                ...season,
                flag: 'U',
                // start_date, end_date ISO → 'YYYY.MM.DD' 포맷 변환
                start_date: season.start_date ? dayjs(season.start_date).format('YYYY.MM.DD') : getFirstDayOfYear(season.year || currentYear),
                end_date: season.end_date ? dayjs(season.end_date).format('YYYY.MM.DD') : getLastDayOfYear(season.year || currentYear),
                profile_image: seasonImages?.[index] ? [seasonImages[index]] : null,
            })),
        };

        if (playerInfo.file_id) {
            initialMainProfileImage.value = [{
                file_id: playerInfo.file_id,
                sn: playerInfo.sn,
                original_name: playerInfo.original_name,
                size: playerInfo.size,
                path: playerInfo.profile_image,
                mimetype: playerInfo.mimetype,
            }];
        }

        initialSeasonImages.value = seasons.map((season) => {
            if (season.file_id) {
                return [{
                    file_id: season.file_id,
                    sn: season.sn,
                    original_name: season.original_name,
                    size: season.size,
                    path: season.profile_image,
                    mimetype: season.mimetype,
                }];
            }
            return [];
        });

        await fetchAllTeamOptionsForSeasons();
    }
};

onMounted(async () => {
    if (isEditMode.value) {
        await fetchPlayer();
    }
    isInitialLoad.value = false;
});

const addSeason = async () => {
    const year = dayjs().year();
    const newSeason = {
        year,
        team_id: null,
        position: null,
        uniform_number: null,
        contract_type: null,
        salary: null,
        start_date: getFirstDayOfYear(year),
        end_date: getLastDayOfYear(year),
        flag: 'I',
        profile_image: null,
        is_active: true,
    };
    form.value.seasons.push(newSeason);

    const teamList = await fetchTeamsByYear(year);
    teamOptionsPerSeason.value.push(teamList);
    initialSeasonImages.value.push(null);
};

const removeSeason = (index) => {
    if (isEditMode.value && form.value.seasons[index]?.id) {
        if (form.value.seasons[index]?.flag === "I") {
            form.value.seasons.splice(index, 1);
            teamOptionsPerSeason.value.splice(index, 1);
            initialSeasonImages.value.splice(index, 1);
        } else {
            form.value.seasons[index].flag = 'D';
            teamOptionsPerSeason.value.splice(index, 1);
            initialSeasonImages.value.splice(index, 1);
        }
    } else {
        form.value.seasons.splice(index, 1);
        teamOptionsPerSeason.value.splice(index, 1);
        initialSeasonImages.value.splice(index, 1);
    }
};

watch(
    () => form.value.seasons.map(season => season.year),
    (newYears, oldYears) => {
        newYears.forEach((newYear, index) => {
            if (newYear !== oldYears[index]) {
                updateSeasonDetails(index, newYear);
            }
        });
    },
    { deep: true }
);

const updateSeasonDetails = async (index, newYear) => {
    if (isInitialLoad.value) return;

    const currentTeamId = form.value.seasons[index].team_id;
    form.value.seasons[index].year = newYear;

    const teamList = await fetchTeamsByYear(newYear);
    teamOptionsPerSeason.value[index] = teamList;

    if (!teamList.some(team => team.id === currentTeamId)) {
        form.value.seasons[index].team_id = null;
    }

    form.value.seasons[index].start_date = getFirstDayOfYear(newYear);
    form.value.seasons[index].end_date = getLastDayOfYear(newYear);
};

const submitForm = async () => {
    if (!formRef.value?.validate()) return;

    const formData = getNewFormData({
        ...form.value,
        birth_date: form.value.birth_date
            ? dayjs(form.value.birth_date).format('YYYY.MM.DD')
            : null,
        seasons: form.value.seasons.map(season => ({
            ...season,
            start_date: season.start_date
                ? dayjs(season.start_date).format('YYYY.MM.DD')
                : null,
            end_date: season.end_date
                ? dayjs(season.end_date).format('YYYY.MM.DD')
                : null,
        })),
    });

    const method = isEditMode.value ? 'PUT' : 'POST';
    const url = isEditMode.value
        ? `/api/admin/player/update/${encodeURIComponent(playerId.value)}`
        : '/api/admin/player/create';

    try {
        const res = await commonFetch(url, {
            method,
            body: formData,
        });

        if (res.success) {
            alert(isEditMode.value ? '선수 정보가 수정되었습니다.' : '선수 정보가 등록되었습니다.');
            router.push('/admin/player/management');
        } else {
            alert(res.message || `선수 정보 ${isEditMode.value ? '수정' : '저장'}에 실패하였습니다.`, 'error');
        }
    } catch (err) {
        alert('서버에서 에러가 발생하였습니다.\n다시 시도해주세요.', 'error');
    }
};


const deleteForm = async () => {
    if (!playerId.value) {
        alert('삭제할 선수가 존재하지 않습니다.', "error");
        return;
    }

    const confirmed = confirm('정말 이 선수를 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
        const res = await commonFetch(
            `/api/admin/player/delete`,
            {
                method: 'DELETE',
                body: {
                    playerId: playerId.value
                }
            }
        );

        if (res.success) {
            alert('선수 정보가 삭제되었습니다.');
            router.push('/admin/player/management');
        } else {
            alert(res.message || '선수 정보 삭제에 실패했습니다.', "error");
        }
    } catch (err) {
        alert('서버 오류가 발생했습니다.\n다시 시도해주세요.', "error");
    }
};
</script>
