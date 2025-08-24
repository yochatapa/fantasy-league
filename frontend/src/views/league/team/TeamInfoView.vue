<template>
    <v-container v-if="isLoadedData">
        <!-- 상단: 팀 이름 -->
        <v-row class="align-center">
            <v-col cols="12" class="d-flex align-center justify-space-between">
                <h1 class="text-h4 font-weight-bold">{{ myTeamInfo?.team_name }}</h1>
            </v-col>
        </v-row>

        <!-- 조건 필터 -->
        <v-row align="center">
            <v-col cols="12" class="d-flex align-center flex-wrap">
                <div class="d-flex align-center">
                    <!-- 이전 날짜 버튼 -->
                    <v-icon @click="prevDay" class="mr-2">mdi-chevron-left</v-icon>

                    <!-- 달력 -->
                    <v-menu
                        v-model="calendarOpen"
                        transition="scale-transition"
                        max-width="290"
                        :close-on-content-click="false"
                    >
                        <template v-slot:activator="{ props }">
                            <v-icon v-bind="props">mdi-calendar</v-icon>
                        </template>
                        <v-date-picker 
                            v-model="selectedDate" 
                            @update:model-value="onDateChange"
                        />
                    </v-menu>

                    <!-- 날짜 표시 -->
                    <span class="text-h6 mx-2">{{ formattedDate }}</span>

                    <!-- 다음 날짜 버튼 -->
                    <v-icon @click="nextDay">mdi-chevron-right</v-icon>
                </div>

                <div>
                    <v-btn
                        v-for="range in dateRanges"
                        :key="range.value"
                        :color="selectedRange === range.value ? 'primary' : 'default'"
                        class="ma-1"
                        @click="selectedRange = range.value"
                    >
                        {{ range.label }}
                    </v-btn>
                </div>

                <v-select
                    v-model="selectedStatType"
                    :items="statTypes"
                    item-value="value"
                    item-title="label"
                    label="스탯 조건"
                    class="ma-2"
                />
            </v-col>
        </v-row>

        <!-- 타자 리스트 -->
        <h2 class="text-h6 font-weight-bold mb-2">Batters</h2>
        <v-data-table
            :headers="batterHeaders"
            :items="batterRows"
            class="mb-6 rounded-lg elevation-1"
            dense
            hide-default-footer
            @click:row="openPlayerDetail"
        >
            <template #item.name="{ item }">
                <div class="d-flex align-center">
                    <v-avatar size="24" class="mr-2">
                        <v-img :src="item.photo" alt="player" />
                    </v-avatar>
                    <span>{{ item.name }}</span>
                    <span class="text-caption grey--text ml-1">({{ item.team }} - {{ item.pos }})</span>
                </div>
            </template>
            <template #item.actions="{ item }">
                <v-btn size="x-small" icon="mdi-swap-horizontal" @click.stop="changePlayer(item)" />
            </template>
        </v-data-table>

        <!-- 투수 리스트 -->
        <h2 class="text-h6 font-weight-bold mb-2">Pitchers</h2>
        <v-data-table
            :headers="pitcherHeaders"
            :items="pitcherRows"
            class="rounded-lg elevation-1"
            dense
            hide-default-footer
            @click:row="openPlayerDetail"
        >
            <template #item.name="{ item }">
                <div class="d-flex align-center">
                    <v-avatar size="24" class="mr-2">
                        <v-img :src="item.photo" alt="player" />
                    </v-avatar>
                    <span>{{ item.name }}</span>
                    <span class="text-caption grey--text ml-1">({{ item.team }} - {{ item.pos }})</span>
                </div>
            </template>
            <template #item.actions="{ item }">
                <v-btn size="x-small" icon="mdi-swap-horizontal" @click.stop="changePlayer(item)" />
            </template>
        </v-data-table>
    </v-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { formatDate } from '@/utils/common/dateUtils.js';
import { commonFetch } from '@/utils/common/commonFetch';
import dayjs from 'dayjs';

const props = defineProps({
    myTeamInfo: Object
});

const router = useRouter();
const route = useRoute();
const isLoadedData = ref(true);
const calendarOpen = ref(false);

// 필터
const selectedDate = ref(route.query.date ? dayjs(route.query.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
const formattedDate = computed(() => dayjs(selectedDate.value).format('YYYY-MM-DD'));
const selectedRange = ref('today');
const selectedStatType = ref('total');

const dateRanges = [
    { label: '오늘', value: 'today' },
    { label: '지난 7일', value: '7' },
    { label: '지난 14일', value: '14' },
    { label: '지난 30일', value: '30' },
    { label: '시즌 전체', value: 'season' },
];

const statTypes = [
    { label: '전체 스탯', value: 'total' },
    { label: '평균 스탯', value: 'average' },
];

// 더미 데이터
const batterRows = ref([
    { id: 1, name: 'Aaron Judge', team: 'NYY', pos: 'CF', opp: '@BOS', stat: '2H 1HR', photo: 'https://placehold.co/32' },
    { id: 2, name: 'Carlos Correa', team: 'MIN', pos: 'SS', opp: 'BAL', stat: '1H 1RBI', photo: 'https://placehold.co/32' },
]);

const pitcherRows = ref([
    { id: 3, name: 'Gerrit Cole', team: 'NYY', pos: 'SP', opp: '@BOS', stat: 'IP 6, K 8, ERA 2.10', photo: 'https://placehold.co/32' },
    { id: 4, name: 'Josh Hader', team: 'HOU', pos: 'RP', opp: 'SEA', stat: 'SV, K 2', photo: 'https://placehold.co/32' },
]);

// 테이블 헤더
const batterHeaders = [
    { text: '포지션', value: 'pos', width: '70px' },
    { text: '선수', value: 'name' },
    { text: '상대', value: 'opp' },
    { text: '스탯', value: 'stat' },
    { text: '', value: 'actions', sortable: false, align: 'end' }
];

const pitcherHeaders = [
    { text: '포지션', value: 'pos', width: '70px' },
    { text: '선수', value: 'name' },
    { text: '상대', value: 'opp' },
    { text: '스탯', value: 'stat' },
    { text: '', value: 'actions', sortable: false, align: 'end' }
];

// 선수 상세 보기
const openPlayerDetail = (player) => {
    router.push(`/player/${player.id}`);
};

// 선수 교체
const changePlayer = (player) => {
    console.log('교체 기능 실행:', player);
};

// 날짜 변경
const onDateChange = (val) => {
    selectedDate.value = val;
    getMatchupList();
};

// 하루 전
const prevDay = () => {
    selectedDate.value = dayjs(selectedDate.value).subtract(1, 'day').format('YYYY-MM-DD');
    getMatchupList();
};

// 하루 후
const nextDay = () => {
    selectedDate.value = dayjs(selectedDate.value).add(1, 'day').format('YYYY-MM-DD');
    getMatchupList();
};

// 데이터 불러오기 예시
const getMatchupList = async () => {
    console.log('선택된 날짜:', selectedDate.value);
    // 실제 API 호출 코드 작성
};
</script>
