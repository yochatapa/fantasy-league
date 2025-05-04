<template>
    <v-container>
        <v-row>
            <v-col cols="12" class="d-flex justify-space-between align-center">
                <span class="text-h6 font-weight-bold">선수 목록</span>
                <v-btn color="primary" @click="goToAddPlayer" class="ml-2">선수 추가</v-btn>
            </v-col>

            <!-- 필터 영역 -->
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
                                                <<v-list-item-title>전체 선택</v-list-item-title>
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
                                        v-model="filters.primaryPositions"
                                        :items="positionOptions"
                                        label="포지션"
                                        multiple
                                    >
                                        <template #prepend-item>
                                            <v-list-item @click="selectAll('primaryPositions')">
                                                    <v-list-item-title>전체 선택</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click="deselectAll('primaryPositions')">
                                                    <v-list-item-title>전체 해제</v-list-item-title>
                                            </v-list-item>
                                        </template>
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 2" :text="item.title"></v-chip>
                                            <span v-if="index === 2" class="text-grey text-caption align-self-center">
                                                외 {{ filters.primaryPositions.length - 2 }}건
                                            </span>
                                        </template>
                                    </v-select>
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-text-field
                                        v-model="filters.birthDateFrom"
                                        label="생년월일 From"
                                        type="date"
                                    />
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-text-field
                                        v-model="filters.birthDateTo"
                                        label="생년월일 To"
                                        type="date"
                                    />
                                </v-col>

                                <v-col cols="12" md="3">
                                    <v-select
                                        v-model="filters.isActiveList"
                                        :items="activeOptions"
                                        label="활동 여부"
                                        multiple
                                        chips
                                    >
                                        <template v-slot:selection="{ item, index }">
                                            <v-chip v-if="index < 2" :text="item.title"></v-chip>
                                            <span v-if="index === 2" class="text-grey text-caption align-self-center">
                                                (+{{ filters.isActiveList.length - 2 }} others)
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

            <!-- 선수 목록 -->
            <v-col cols="12">
                <!-- PC용 -->
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
                    <template #item.position="{ item }">
                        {{ item.position }}
                    </template>
                    <template #item.back_number="{ item }">
                        {{ item.back_number || '-' }}
                    </template>
                    <template #item.birth="{ item }">
                        {{ item.birth || '-' }}
                    </template>
                </v-data-table-server>

                <!-- 모바일용 -->
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
                                <div><strong>포지션:</strong> {{ item.position }}</div>
                                <div><strong>등번호:</strong> {{ item.back_number || '-' }}</div>
                                <div><strong>생년월일:</strong> {{ item.birth || '-' }}</div>
                            </div>
                        </v-card>
                    </template>
                </v-data-table-server>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { commonFetch } from '@/utils/common/commonFetch';
import { encryptData } from '@/utils/common/crypto';
import { fa } from 'vuetify/locale';

const router = useRouter();
const route = useRoute();
const { mobile } = useDisplay();

const players = ref([]);
const loading = ref(false);
const page = ref(Number(route.query.page) || 1);
const itemsPerPage = ref(10);
const totalItems = ref(0);
const filterExpanded = ref(false);

const filters = ref({
    teamIds: [],
    primaryPositions: [],
    birthDateFrom: '',
    birthDateTo: '',
    isActiveList: [true,false],
});

const teamOptions = ref([]);
const positionOptions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
const activeOptions = [
    { title: '활동', value: true },
    { title: '비활동', value: false },
];

const headers = [
    { title: '번호', value: 'index', width: 80, align: 'center' },
    { title: '이름', value: 'name', align: 'center' },
    { title: '생년월일', value: 'birth_date', align: 'center' },
    { title: '포지션', value: 'primary_position', align: 'center' },
    { title: '유형', value: 'player_type', align: 'center' },
    { title: '소속팀', value: 'team_name', align: 'center' },
    { title: '활동여부', value: 'is_active', align: 'center' },
];

const fetchPlayerList = async () => {
    try {
        loading.value = true;

        const params = new URLSearchParams();
        params.append('page', page.value);
        params.append('limit', itemsPerPage.value);
        params.append('filters', JSON.stringify(filters.value));

        const response = await commonFetch('GET', '/players', params);
        players.value = response.data;
        totalItems.value = response.total;
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
    router.push({ name: 'add-player' });
};

const resetFilters = () => {
    filters.value = {
        teamIds: [],
        primaryPositions: [],
        birthDateFrom: '',
        birthDateTo: '',
        isActiveList: [],
    };
};

// selectAll 메서드를 수정하여, 필드 값에 대해 모든 항목을 선택하도록 수정
const selectAll = (field) => {
    if (field === 'teamIds') {
        filters.value.teamIds = teamOptions.value.map(team => team.id);
    } else if (field === 'primaryPositions') {
        filters.value.primaryPositions = positionOptions;
    } else if (field === 'isActiveList') {
        filters.value.isActiveList = activeOptions.map(option => option.value);
    }
};

const deselectAll = (field) => {
    if (field === 'teamIds') {
        filters.value.teamIds = [];
    } else if (field === 'primaryPositions') {
        filters.value.primaryPositions = [];
    } else if (field === 'isActiveList') {
        filters.value.isActiveList = [];
    }
};

const fetchTeamOptions = async () => {
    const response = await commonFetch('/api/admin/team/list', { method: 'GET' });
    if (response.success) {
        teamOptions.value = response.data.teamList || [];
    }
};

const handleRowClick = (e, { item }) => {
    router.push(`/admin/player/add?playerId=${encodeURIComponent(encryptData(item.id))}`);
};

onMounted(async () => {
    await fetchTeamOptions();
    selectAll("teamIds")
    selectAll("primaryPositions")
    fetchPlayerList();
});
</script>
