<template>
    <v-container>
        <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center">
                <span class="text-h6 font-weight-bold">선수 목록</span>
                <v-btn color="primary" @click="goToAddPlayer" class="ml-2">선수 추가</v-btn>
            </v-col>

            <v-col cols="12">
                <v-card class="mb-4 pa-4 rounded-lg elevation-1">
                    <v-row class="align-center mb-2">
                        <v-col cols="6">
                            <v-icon start color="primary">mdi-filter-variant</v-icon>
                            <span class="text-subtitle-1 font-weight-medium">조회 조건</span>
                        </v-col>
                        <v-col cols="6" class="text-right">
                            <v-btn
                                icon
                                variant="text"
                                @click="filterExpanded = !filterExpanded"
                                :aria-label="filterExpanded ? '필터 접기' : '필터 펼치기'"
                            >
                                <v-icon>{{ filterExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                            </v-btn>
                        </v-col>
                    </v-row>

                    <v-expand-transition>
                        <div v-show="filterExpanded">
                            <v-row class="g-4">
                                <v-col cols="12" md="3">
                                    <v-text-field
                                        v-model="filters.name"
                                        label="이름"
                                        clearable
                                    ></v-text-field>
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-select
                                        v-model="filters.teamIds"
                                        :items="teamOptions"
                                        item-title="name"
                                        item-value="id"
                                        label="소속팀"
                                        multiple
                                    >
                                        <template #prepend-item class="d-flex">
                                            <v-list-item @click="selectAll('teamIds')">
                                                <v-list-item-title>전체 선택</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click="deselectAll('teamIds')">
                                                <v-list-item-title>전체 해제</v-list-item-title>
                                            </v-list-item>
                                        </template>
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 1" :text="item.title"></v-chip>
                                            <span v-if="index === 1" class="text-grey text-caption align-self-center">
                                                외 {{ filters.teamIds.length - 1 }}건
                                            </span>
                                        </template>
                                    </v-select>
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-select
                                        v-model="filters.positions"
                                        :items="positionOptions"
                                        label="포지션"
                                        multiple
                                    >
                                        <template #prepend-item>
                                            <v-list-item @click="selectAll('positions')">
                                                <v-list-item-title>전체 선택</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click="deselectAll('positions')">
                                                <v-list-item-title>전체 해제</v-list-item-title>
                                            </v-list-item>
                                        </template>
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 2" :text="item.title"></v-chip>
                                            <span v-if="index === 2" class="text-grey text-caption align-self-center">
                                                외 {{ filters.positions.length - 2 }}건
                                            </span>
                                        </template>
                                    </v-select>
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-select
                                        v-model="filters.activeYears"
                                        :items="activeYearOptions"
                                        label="활동 연도"
                                        multiple
                                    >
                                        <template #prepend-item>
                                            <v-list-item @click="selectAll('activeYears')">
                                                <v-list-item-title>전체 선택</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click="deselectAll('activeYears')">
                                                <v-list-item-title>전체 해제</v-list-item-title>
                                            </v-list-item>
                                        </template>
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 2" :text="item.title"></v-chip>
                                            <span v-if="index === 2" class="text-grey text-caption align-self-center">
                                                외 {{ filters.activeYears.length - 2 }}건
                                            </span>
                                        </template>
                                    </v-select>
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-select
                                        v-model="filters.isForeigners"
                                        :items="foreignerOptions"
                                        label="외국인 선수 여부"
                                        multiple
                                        chips
                                    >
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 2" :text="item.title"></v-chip>
                                            <span v-if="index === 2" class="text-grey text-caption align-self-center">
                                                (+{{ filters.isForeigners.length - 2 }} others)
                                            </span>
                                        </template>
                                    </v-select>
                                </v-col>

                                <v-col cols="12" md="3">
                                    <CommonDateInput
                                        v-model="filters.birthDateFrom"
                                        label="생년월일 From"
                                        :max="today"
                                        :rules="[v => !!v || '생년월일을 입력해주세요.']"
                                        :required="true"
                                    />
                                </v-col>

                                <v-col cols="12" md="3">
                                    <CommonDateInput
                                        v-model="filters.birthDateTo"
                                        label="생년월일 To"
                                        :max="today"
                                        :rules="[v => !!v || '생년월일을 입력해주세요.']"
                                        :required="true"
                                    />
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-select
                                        v-model="filters.isRetiredList"
                                        :items="activeOptions"
                                        label="활동 여부"
                                        multiple
                                        chips
                                    >
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 2" :text="item.title"></v-chip>
                                            <span v-if="index === 2" class="text-grey text-caption align-self-center">
                                                (+{{ filters.isRetiredList.length - 2 }} others)
                                            </span>
                                        </template>
                                    </v-select>
                                </v-col>


                            </v-row>
                        </div>
                    </v-expand-transition>
                    <v-col cols="12" class="text-right">
                        <v-btn color="primary" class="me-2" @click="fetchPlayerList">조회</v-btn>
                        <v-btn variant="tonal" @click="resetFilters">초기화</v-btn>
                    </v-col>
                </v-card>
            </v-col>

            <v-col cols="12">
                <v-data-table-server
                    v-if="!mobile"
                    :headers="headers"
                    :items="players"
                    :loading="loading"
                    :items-length="totalItems"
                    v-model:page="page"
                    v-model:items-per-page="itemsPerPage"
                    class="elevation-1 mt-2"
                    loading-text="선수 목록을 불러오는 중입니다..."
                    @click:row="handleRowClick"
                >
                    <template #item.index="{ index }">
                        {{ (page - 1) * itemsPerPage + index + 1 }}
                    </template>
                    <template #item.name="{ item }">
                        {{ item.name }}
                    </template>
                    <template #item.team_name="{ item }">
                        {{ item.team_name || '-' }}
                    </template>
                    <template #item.primary_position="{ item }">
                        {{ item.primary_position }}
                    </template>
                    <template #item.last_uniform_number="{ item }">
                        {{ item.last_uniform_number || '-' }}
                    </template>
                    <template #item.birth_date="{ item }">
                        {{ item.birth_date || '-' }}
                    </template>
                    <template #item.player_type="{ item }">
                        {{ item.player_type==="B"?"타자":"투수" }}
                    </template>
                    <template #item.is_foreign="{ item }">
                        {{ item.is_foreign ? '외국인' : '국내' }}
                    </template>
                    <template #item.active_years="{ item }">
                        {{ item.active_years ? item.active_years : '-' }}
                    </template>
                    <template #item.is_retired="{ item }">
                        {{ item.is_retired ? '은퇴' : '현역' }}
                    </template>
                </v-data-table-server>

                <v-data-table-server
                    v-else
                    :headers="headers"
                    :items="players"
                    :loading="loading"
                    :items-length="totalItems"
                    v-model:page="page"
                    v-model:items-per-page="itemsPerPage"
                    class="mt-2"
                    mobile
                    hide-default-header
                    style="background: transparent; border: 0;"
                    loading-text="선수 목록을 불러오는 중입니다..."
                >
                    <template #item="{ item, index }">
                        <v-card class="mb-2 pa-3" @click="(event) => handleRowClick(event, { item })">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-subtitle-1 font-weight-bold">
                                    #{{ (page - 1) * itemsPerPage + index + 1 }}
                                </div>
                            </div>
                            <div class="text-body-2">
                                <div><strong>이름:</strong> {{ item.name }}</div>
                                <div><strong>소속팀:</strong> {{ item.team_name || '-' }}</div>
                                <div><strong>주 포지션:</strong> {{ item.primary_position }}</div>
                                <div><strong>등번호:</strong> {{ item.last_uniform_number || '-' }}</div>
                                <div><strong>생년월일:</strong> {{ item.birth_date || '-' }}</div>
                                <div><strong>유형:</strong> {{ item.player_type==="B"?"타자":"투수" }}</div>
                                <div><strong>외국인:</strong> {{ item.is_foreign ? '외국인' : '국내' }}</div>
                                <div><strong>활동 연도:</strong> {{ item.active_years ? item.active_years : '-' }}</div>
                                <div><strong>활동 여부:</strong> {{ item.is_retired ? '은퇴' : '현역' }}</div>
                            </div>
                        </v-card>
                    </template>
                </v-data-table-server>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import CommonDateInput from '@/components/common/CommonDateInput.vue';
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { commonFetch } from '@/utils/common/commonFetch';
import { encryptData } from '@/utils/common/crypto';

const router = useRouter();
const route = useRoute();
const { mobile } = useDisplay();
const today = ref(new Date().toLocaleString());

const players = ref([]);
const loading = ref(false);
const page = ref(Number(route.query.page) || 1);
const itemsPerPage = ref(10);
const totalItems = ref(0);
const filterExpanded = ref(false);

const filters = ref({
    name: '', // 이름 필터 추가
    teamIds: [],
    positions: [],
    birthDateFrom: '',
    birthDateTo: '',
    isRetiredList: [],
    activeYears: [], // 활동 연도 필터 추가
    isForeigners: [], // 외국인 선수 여부 필터 추가
});

const teamOptions = ref([]);
const positionOptions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
const activeOptions = [
    { title: '현역', value: false },
    { title: '은퇴', value: true },
];
const foreignerOptions = [
    { title: '외국인', value: true },
    { title: '국내', value: false },
];
const activeYearOptions = ref([]); // 활동 연도 옵션

const headers = [
    { title: '번호', value: 'index', width: 80, align: 'center' },
    { title: '이름', value: 'name', align: 'center' },
    { title: '생년월일', value: 'birth_date', align: 'center' },
    { title: '주 포지션', value: 'primary_position', align: 'center' },
    { title: '유형', value: 'player_type', align: 'center' },
    { title: '소속팀', value: 'team_name', align: 'center' },
    { title: '등번호', value: 'last_uniform_number', align: 'center' },
    { title: '외국인', value: 'is_foreign', align: 'center' }, // 외국인 선수 여부 컬럼 추가
    { title: '활동 연도', value: 'active_years', align: 'center' }, // 활동 연도 컬럼 추가
    { title: '활동여부', value: 'is_retired', align: 'center' },
];

const fetchPlayerList = async () => {
    try {
        loading.value = true;

        const params = new URLSearchParams();
        params.append('page', page.value);
        params.append('limit', itemsPerPage.value);

        if (filters.value.name) {
            params.append('name', filters.value.name);
        }
        if (filters.value.teamIds.length > 0) {
            params.append('teamIds', filters.value.teamIds.join(','));
        }
        if (filters.value.positions.length > 0) {
            params.append('positions', filters.value.positions.join(','));
        }
        if (filters.value.isRetiredList.length > 0) {
            params.append('isRetiredList', filters.value.isRetiredList.join(','));
        }
        if (filters.value.birthDateFrom) {
            params.append('birthDateFrom', filters.value.birthDateFrom);
        }
        if (filters.value.birthDateTo) {
            params.append('birthDateTo', filters.value.birthDateTo);
        }
        if (filters.value.activeYears.length > 0) {
            params.append('activeYears', filters.value.activeYears.join(','));
        }
        if (filters.value.isForeigners.length > 0) {
            params.append('isForeignerList', filters.value.isForeigners.join(','));
        }

        const queryString = params.toString();
        const response = await commonFetch(`/api/admin/player/list?${queryString}`, {
            method: "GET"
        });

        players.value = response.data.playerList;
        totalItems.value = response.data.total;
    } catch (err) {
        console.error('선수 목록 조회 실패', err);
    } finally {
        loading.value = false;
    }
};

const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString() : '-';
};

const goToAddPlayer = () => {
    router.push("/admin/player/add");
};

const resetFilters = () => {
    filters.value = {
        name: '',
        teamIds: [],
        positions: [],
        birthDateFrom: '',
        birthDateTo: '',
        isRetiredList: [],
        activeYears: [],
        isForeigners: [],
    };
};

const selectAll = (field) => {
    if (field === 'teamIds') {
        filters.value.teamIds = teamOptions.value.map(team => team.id);
    } else if (field === 'positions') {
        filters.value.positions = positionOptions;
    } else if (field === 'isRetiredList') {
        filters.value.isRetiredList = activeOptions.map(option => option.value);
    } else if (field === 'activeYears') {
        filters.value.activeYears = activeYearOptions.value;
    } else if (field === 'isForeigners') {
        filters.value.isForeigners = foreignerOptions.map(option => option.value);
    }
};

const deselectAll = (field) => {
    if (field === 'teamIds') {
        filters.value.teamIds = [];
    } else if (field === 'positions') {
        filters.value.positions = [];
    } else if (field === 'isRetiredList') {
        filters.value.isRetiredList = [];
    } else if (field === 'activeYears') {
        filters.value.activeYears = [];
    } else if (field === 'isForeigners') {
        filters.value.isForeigners = [];
    }
};

const fetchTeamOptions = async () => {
    const response = await commonFetch('/api/admin/team/list', { method: 'GET' });
    if (response.success) {
        teamOptions.value = response.data.teamList || [];
    }
};

const fetchActiveYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 1982; // 예시 시작 연도
    const years = [];
    for (let i = currentYear; i >= startYear; i--) {
        years.push(i);
    }
    activeYearOptions.value = years;
};

const handleRowClick = (e, { item }) => {
    router.push(`/admin/player/add?playerId=${encodeURIComponent(encryptData(item.id))}`);
};

onMounted(async () => {
    await fetchTeamOptions();
    fetchActiveYearOptions();
    fetchPlayerList();
});
</script>