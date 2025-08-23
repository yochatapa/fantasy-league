<template>
    <v-container v-if="isLoadedData">
        <v-row class="align-center mb-6" no-gutters>
            <v-col cols="12" class="d-flex align-center justify-space-between">
                <h1 class="text-h4 font-weight-bold mr-2">{{ leagueInfo?.league_name }}</h1>
                <v-icon @click="copyLink" color="primary" style="cursor: pointer;">
                    mdi-share-variant
                </v-icon>
            </v-col>

            <v-col cols="12" class="d-flex">
                <v-list dense class="horizontal-list bg-transparent pa-0">
                    <v-list-item
                        v-if="seasonInfo?.length === 1"
                        class="pa-0"
                    >
                        <v-list-item-title>({{ seasonYear }}년)</v-list-item-title>
                    </v-list-item>

                    <v-list-item v-else link class="pa-0">
                        <v-menu
                            bottom
                            offset-y
                            transition="slide-y-transition"
                            :open-on-hover="!isMobile"
                            close-on-content-click
                        >
                            <template v-slot:activator="{ props }">
                                <v-list-item-title v-bind="props" class="d-flex align-center">
                                    ({{ seasonYear }}년)
                                    <v-icon right>mdi-menu-down</v-icon>
                                </v-list-item-title>
                            </template>

                            <v-list>
                                <v-list-item
                                    v-for="(year, index) in filteredSeasonYears"
                                    :key="index"
                                >
                                    <v-list-item-title>
                                        {{ year.season_year }}년
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </v-list-item>
                </v-list>
            </v-col>
        </v-row>

        <v-card class="mb-6">
            <v-card-text>
                <div class="d-flex align-center justify-space-between">
                    <div>{{ noticeSummary }}</div>
                    <v-icon @click="goToNotices" class="ml-2" style="cursor: pointer;">
                        mdi-chevron-right
                    </v-icon>
                </div>
            </v-card-text>
        </v-card>
        
        <v-row v-if="currentSeasonInfo?.season_status === 'pending'">
            <v-col cols="12">
                <v-card>
                    <v-card-title class="d-flex justify-space-between align-center">
                        시즌 일정
                    </v-card-title>
                    <v-divider></v-divider>
                    <div class="d-flex flex-column align-center position-relative mt-6 mb-2 pt-6 pb-10 mx-10">
                        <div ref="barRef" class="position-relative timeline-bar my-4" style="height: 8px; background: #e0e0e0; width: 100%; border-radius: 4px;">
                            <div
                                v-for="item in datePercents"
                                :key="item.key"
                                class="position-absolute text-no-wrap"
                                :style="{
                                    left: `calc(${item.percent}%)`,
                                    transform: 'translateX(-50%)',
                                    textAlign: 'center',
                                    bottom: '-7px'
                                }"
                            > 
                                <div class="text-caption font-weight-bold">
                                    {{ item.label }}
                                </div>
                                <div class="text-caption font-weight-bold" v-if="item.key!=='today'">
                                    {{ item.ddayText }}
                                </div>
                                <v-icon
                                    :color="item.key === 'today' ? 'blue' : (item.key === 'draft' ? 'green' : 'red')"
                                    size="10"
                                >mdi-circle</v-icon>
                            </div>
                        </div>

                        <div class="d-flex justify-space-between w-100 text-caption mt-2">
                            <div
                                v-for="item in datePercents"
                                :key="item.key"
                                :style="{ left: `calc(${item.percent}%)`, transform: 'translateX(-50%)', position: 'absolute', textAlign: 'center', top: '60px' }"
                            >
                                {{ item.formatted }}
                            </div>
                            <div
                                v-for="item in datePercents"
                                :key="item.key"
                                :style="{ left: `calc(${item.percent}%)`, transform: 'translateX(-50%)', position: 'absolute', textAlign: 'center', top: '74px' }"
                                class="text-no-wrap"
                            >
                                {{ item.key!=="start"?item.time:'' }}
                            </div>
                            <div
                                v-for="item in datePercents"
                                :key="item.key"
                                :style="{ left: `calc(${item.percent}%)`, transform: 'translateX(-50%)', position: 'absolute', textAlign: 'center', top: (item.key==='draft'?'88px':'74px') }"
                                class="text-no-wrap"
                            >
                                {{ item.key==="today"?'':item.label }}
                            </div>
                        </div>
                    </div>
                </v-card>
            </v-col>
        </v-row>

        <v-row v-if="currentSeasonInfo?.season_status === 'pending'">
            <v-col cols="12" v-if="draftRoom?.status !== 'finished'">
                <v-card>
                    <v-card-title class="d-flex justify-space-between align-center">
                        <span>드래프트 순번</span>
                        <v-btn color="primary" v-if="draftRoom && draftRoom?.status !== 'finished'" @click="goToDraftRoom()">입장</v-btn>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text>
                        <v-table>
                            <thead>
                                <tr>
                                    <th class="text-center" style="width: 80px;">순번</th>
                                    <th class="text-left">팀</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="team in draftTeams" :key="team.draft_order">
                                    <td class="text-center">
                                        <span v-if="team.team_id">{{ team.draft_order }}</span>
                                        <v-btn
                                            v-else
                                            color="primary"
                                            variant="outlined"
                                            size="small"
                                            @click="selectDraftSlot(team.draft_order)"
                                        >
                                            {{ team.draft_order }}번
                                        </v-btn>
                                    </td>

                                    <td>
                                        <div v-if="team.team_id" class="d-flex align-center" style="gap: 8px">
                                            <v-avatar size="24" v-if="team.file_path">
                                                <v-img :src="team.file_path" :alt="team.team_name" />
                                            </v-avatar>
                                            <span>{{ team.team_name }}</span>
                                        </div>
                                        <span v-else class="text-grey">미정</span>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" v-if="draftRoom && draftRoom?.status === 'finished'">
                <v-card>
                    <v-card-title class="d-flex justify-space-between align-center">
                        <span>드래프트 결과</span>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text>
                        <v-row>
                            <v-col
                                cols="12"
                                md="4"
                                v-for="team in draftTeams"
                                :key="team.team_id"
                            >
                                <v-card class="mb-4" elevation="2">
                                    <v-card-title class="text-h6">{{ team.nickname }} 팀</v-card-title>
                                    <v-divider />
                                    <v-list style="max-height: 400px; overflow-y: auto;">
                                        <v-list-item
                                            v-for="(player, idx) in draftResults[team.team_id] || []"
                                            :key="idx"
                                        >
                                            <v-list-item-title>
                                                {{ player.name }} ({{ player.position }})
                                            </v-list-item-title>
                                        </v-list-item>
                                    </v-list>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-row align="stretch" no-gutters gap="6" v-if="currentSeasonInfo?.season_status !== 'pending'">
            <v-col :cols="isMobile ? 12 : 8" :class="[ isMobile?'mb-6':'']">
                <v-card :class="[
                        'pa-4'
                        , 'mb-6'
                        , isMobile?'':'mr-6'
                    ]" elevation="2" style="height: 100%;">
                    <v-card-title class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                            이번 주 매치
                            <span class="text-caption ml-2">({{ currentWeek }}주차)</span>
                        </div>
                        <v-icon 
                            color="primary"
                            style="cursor: pointer;"
                            @click="toggleDetails"
                        >
                            {{ isDetailsOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                        </v-icon>
                    </v-card-title>

                    <v-divider class="my-4"></v-divider>

                    <div v-for="(match, index) in displayMatches" :key="index" class="mb-6">
                        <v-row class="justify-center align-center">
                            <v-col cols="auto" class="text-center">
                                <v-avatar size="40" class="mb-1">
                                    <v-img :src="match.myImage" />
                                </v-avatar>
                                <div class="text-subtitle1">{{ match.away_team_name }}</div>
                                <div class="text-caption text-grey">{{ match.away_team_rank }}위</div>
                            </v-col>
                            <v-col cols="auto" class="text-center">
                                <div class="text-h6">{{ Number(match.away_score) }} : {{ Number(match.home_score) }}</div>
                            </v-col>
                            <v-col cols="auto" class="text-center">
                                <v-avatar size="40" class="mb-1">
                                    <v-img :src="match.opponentImage" />
                                </v-avatar>
                                <div class="text-subtitle1">{{ match.home_team_name }}</div>
                                <div class="text-caption text-grey">{{ match.home_team_rank }}위</div>
                            </v-col>
                        </v-row>
                        <v-divider class="my-4" />
                    </div>

                    <v-expand-transition>
                        <div v-if="isDetailsOpen && additionalMatches.length > 0">
                            <div v-for="(match, index) in additionalMatches" :key="index" class="mb-6">
                                <v-row class="justify-center align-center">
                                    <v-col cols="auto" class="text-center">
                                        <v-avatar size="40" class="mb-1">
                                            <v-img :src="match.myImage" />
                                        </v-avatar>
                                        <div class="text-subtitle1">{{ match.away_team_name }}</div>
                                        <div class="text-caption text-grey">{{ match.away_team_rank }}위</div>
                                    </v-col>
                                    <v-col cols="auto" class="text-center">
                                        <div class="text-h6">{{ Number(match.away_score) }} : {{ Number(match.home_score) }}</div>
                                    </v-col>
                                    <v-col cols="auto" class="text-center">
                                        <v-avatar size="40" class="mb-1">
                                            <v-img :src="match.opponentImage" />
                                        </v-avatar>
                                        <div class="text-subtitle1">{{ match.home_team_name }}</div>
                                        <div class="text-caption text-grey">{{ match.home_team_rank }}위</div>
                                    </v-col>
                                </v-row>
                                <v-divider class="my-4" />
                            </div>
                        </div>
                    </v-expand-transition>
                </v-card>
            </v-col>

            <v-col :cols="isMobile ? 12 : 4">
                <v-card class="pa-4 mb-6" elevation="2" style="height: 100%;">
                    <v-card-title class="text-h6">리그 순위</v-card-title>
                    <v-divider class="my-2" />

                    <v-list dense nav>
                        <v-list-item
                            v-for="team in rankings"
                            :key="team.rank"
                            class="px-0"
                        >
                            <div class="d-flex align-center justify-space-between mt-2 mb-4">
                                <div class="d-flex align-center">
                                    <span class="text-grey text-caption mr-2">{{ team.rank !== 0?team.rank:'-' }}위</span>
                                    <span>{{ team.team_name }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-body-2 font-weight-medium">{{ team.wins }}승 {{ team.losses }}패</span>
                                </div>
                            </div>
                            <v-divider></v-divider>
                        </v-list-item>
                    </v-list>
                </v-card>
            </v-col>
        </v-row>

        <v-card class="pa-4 mt-6" elevation="2" v-if="currentSeasonInfo?.season_status !== 'pending'">
            <v-card-title class="text-h6 pb-2">
                로스터 변동 이력
            </v-card-title>
            <v-divider class="my-2" />
            <div style="max-height: 300px; overflow-y: auto;overflow-x: hidden;">
            <v-list dense>
                <v-list-item :key="index" v-for="(transaction, index) in transactionsList">
                    <div class="d-flex align-center mb-2">
                        <v-icon :color="isPlayerAdded(transaction.transaction_type) ? 'green' : 'red'" class="mr-1">
                            {{ isPlayerAdded(transaction.transaction_type) ? 'mdi-plus-circle-outline' : 'mdi-minus-circle-outline' }}
                        </v-icon>
                        {{ TRANSACTION_TYPE.find(tt => tt.id ===transaction.transaction_type)?.label }}
                    </div>
                    <v-list-item-title>
                        <span class="font-weight-bold">{{ transaction.team_name }}</span>
                        {{ isPlayerAdded(transaction.transaction_type) ? '이(가) ' : '이(가) ' }}
                        <span class="font-weight-bold">{{ transaction.player_name }}</span>
                        {{ isPlayerAdded(transaction.transaction_type) ? '선수를 영입했습니다.' : '선수를 방출했습니다.' }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="caption mt-1">
                        {{ dayjs(transaction.transaction_date).format('YYYY.MM.DD HH:mm') }}
                    </v-list-item-subtitle>
                    <v-divider :key="'divider-' + index" v-if="index < transactionsList.length - 1" class="mt-4"/>
                </v-list-item>
            </v-list>
            </div>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { useDisplay } from 'vuetify';
import { commonFetch } from '@/utils/common/commonFetch';
import { LEAGUE_TYPES, LEAGUE_FORMATS, TRANSACTION_TYPE } from '@/utils/code/code';
import { encryptData } from '@/utils/common/crypto.js';
import { formatDate } from '@/utils/common/dateUtils.js';

const props = defineProps({
    menus: Array,
    leagueInfo: Object,
    currentSeasonInfo: Object,
    myTeamInfo: Object,
});

const { copy } = useClipboard();
const { mobile } = useDisplay();

const route = useRoute();
const router = useRouter();

const isMobile = computed(() => mobile.value);

const currentWeek = ref(5);
const noticeSummary = ref("공지사항 테스트입니다. 다들 주목하세요. 한국의 오타니~ 김혜성~~~!");

const orgLeagueId = route.query.leagueId;

// props 값을 담을 변수들
const leagueInfo = ref({});
const seasonInfo = ref([]);
const currentSeasonInfo = ref({});
const myTeamInfo = ref({});
const draftTeams = ref([]);
const draftRoom = ref({});


// 기존 변수들
const filteredSeasonYears = ref([]);
const draftResults = ref({});

const seasonYear = ref(null);

const isLoadedData = ref(false);

watch([seasonInfo, seasonYear], () => {
    filteredSeasonYears.value = seasonInfo.value.filter((sy) => sy.season_year !== seasonYear.value);
});

const barRef = ref(null);
const barWidth = ref(0);

window.addEventListener('resize', () => {
    if (barRef.value) {
        barWidth.value = barRef.value.offsetWidth;
    }
});

const today = ref(dayjs());
setInterval(() => {
    today.value = dayjs();
}, 1000 * 60);

const draftDate = computed(() => {
    if (!currentSeasonInfo.value || !currentSeasonInfo.value.draft_start_date) return null;
    return dayjs(currentSeasonInfo.value.draft_start_date);
});

const startDate = computed(() => {
    if (!currentSeasonInfo.value || !currentSeasonInfo.value.start_date) return null;
    return dayjs(currentSeasonInfo.value.start_date, 'YYYY.MM.DD');
});

const MIN_PIXEL_GAP = 100;

const getDDayText = (date) => {
    const diff = dayjs(date).startOf('day').diff(today.value.startOf('day'), 'day');
    if (diff > 0) return `D-${diff}`;
    if (diff < 0) return `D+${Math.abs(diff)}`;
    return 'D-Day';
};

const isPlayerAdded = type => {
    return ['add', 'waiver_add', 'drafted'].includes(type);
}

const datePercents = computed(() => { 
    if (!barWidth.value) barWidth.value = barRef.value?.offsetWidth;
    if (!barWidth.value || !currentSeasonInfo.value) return [];

    const draft = draftDate.value;
    const start = startDate.value;

    if (!draft?.isValid() || !start?.isValid()) return [];

    const all = [
        { key: 'today', label: '오늘', date: today.value },
        { key: 'draft', label: '드래프트', date: draft },
        { key: 'start', label: '시즌 시작', date: start }
    ];

    const merged = [];
    for (const item of all) {
        const existing = merged.find(m => m.date.valueOf() === item.date.valueOf());
        if (existing) {
            existing.key += `,${item.key}`;
            existing.label += `, ${item.label}`;
        } else {
            merged.push({ ...item });
        }
    }

    merged.sort((a, b) => a.date.valueOf() - b.date.valueOf());

    const min = merged[0].date.valueOf();
    const max = merged[merged.length - 1].date.valueOf();
    const total = max - min || 1;

    const raw = merged.map(entry => {
        const percent = ((entry.date.valueOf() - min) / total) * 100;
        const px = (percent / 100) * barWidth.value;
        const hour = entry.date.hour();
        const minute = entry.date.minute();

        return {
            ...entry,
            percent,
            px,
            ddayText: getDDayText(entry.date),
            formatted: formatDate(entry.date),
            time: `${hour}:${minute.toString().padStart(2, '0')}`
        };
    });

    const adjusted = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
        const prev = adjusted[i - 1];
        const current = { ...raw[i] };
        if (current.px - prev.px < MIN_PIXEL_GAP) {
            current.px = prev.px + MIN_PIXEL_GAP;
        }
        adjusted.push(current);
    }

    const newMaxPx = adjusted[adjusted.length - 1].px;
    adjusted.forEach(item => {
        item.percent = (item.px / newMaxPx) * 100;
    });

    return adjusted;
});

const copyLink = () => {
    copy(window.location.origin + `/league/join?inviteCode=${encodeURIComponent(encryptData(leagueInfo.value.invite_code))}`);
    alert("초대 링크가 복사되었습니다.");
};

const matches = ref([]);
const transactionsList = ref([]);
const rankings = ref([]);

const loadSeasonData = async () => {
    if (!currentSeasonInfo.value.season_id) return;

    const seasonId = currentSeasonInfo.value.season_id;
    
    try {
        const [seasonRes, matchesRes, transactionsRes, rankingsRes] = await Promise.all([
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonId))}/info`),
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonId))}/matches`),
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonId))}/transactions`),
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonId))}/rankings`),
        ]);

        if(seasonRes.success){
            draftTeams.value = seasonRes.data.draftTeams;
            draftRoom.value = seasonRes.data.draftRoom;
            draftResults.value = seasonRes.data.draftResults;
        }

        if (matchesRes.success) {
            matches.value = matchesRes.data.matches || [];
        } else {
            // 오류 처리: matches API 호출 실패
            console.error('Failed to load matches:', matchesRes.message);
        }

        if (transactionsRes.success) {
            transactionsList.value = transactionsRes.data.transactions || [];
        } else {
            // 오류 처리: transactions API 호출 실패
            console.error('Failed to load transactions:', transactionsRes.message);
        }

        if (rankingsRes.success) {
            rankings.value = rankingsRes.data.rankings || [];
        } else {
            // 오류 처리: rankings API 호출 실패
            console.error('Failed to load rankings:', rankingsRes.message);
        }
    } catch (err) {
        // Promise.all 내에서 발생한 치명적인 오류 처리 (e.g., 네트워크 문제)
        console.error('An error occurred during season data loading:', err);
    }
};

const isDetailsOpen = ref(false);

onMounted(async () => {
    if (!isMobile.value) {
        isDetailsOpen.value = true;
    }

    watch(
        () => [
            props.leagueInfo,
            props.currentSeasonInfo,
            props.myTeamInfo
        ],
        async ([
            newLeagueInfo,
            newCurrentSeasonInfo,
            newMyTeamInfo
        ]) => {
            const hasAllData =
            newLeagueInfo &&
            newCurrentSeasonInfo &&
            newMyTeamInfo
            
            if (hasAllData) {
                leagueInfo.value = newLeagueInfo;
                currentSeasonInfo.value = newCurrentSeasonInfo;
                myTeamInfo.value = newMyTeamInfo

                isLoadedData.value = true;
                
                try {
                    await loadSeasonData();
                } catch (err) {
                    console.error("loadSeasonData 실패:", err);
                }
            } else {
                // 데이터 부족할 때 초기화 (옵션)
                isLoadedData.value = false;
            }
        },
        { immediate: true }
    );
});

watch(isMobile, (newVal) => {
    isDetailsOpen.value = !newVal;
});

const displayMatches = computed(() => {
    return matches.value.filter(match => match.is_me);
});

const additionalMatches = computed(() => {
    return matches.value.filter(match => !match.is_me);
});

const toggleDetails = () => {
    isDetailsOpen.value = !isDetailsOpen.value;
};

const goToNotices = () => {
    console.log("hihi");
};

const selectDraftSlot = async (order) => {
    try {
        const orderRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(currentSeasonInfo.value.season_id))}/draft-order`, {
            method: "POST",
            body: {
                order: order
            }
        });

        if (!orderRes.success && orderRes?.data?.code === -1) {
            alert(orderRes.message, "error");
        }
    } catch (error) {
        alert("드래프트 순서를 바꾸는 도중 문제가 발생하였습니다.", "error");
    } finally {
        await getDraftOrder();
    }
};

const getDraftOrder = async () => {
    const seasonRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonInfo.value[0].season_id))}/info`);
    if (seasonRes.success) {
        draftTeams.value = seasonRes.data.draftTeams;
    }
};

const goToDraftRoom = () => {
    router.push("/league/draftroom?leagueId="+encodeURIComponent(orgLeagueId)+"&seasonId="+encodeURIComponent(encryptData(currentSeasonInfo.value.season_id)))
}
</script>


<style scoped>
h1 {
    margin: 0;
}

.timeline-bar {
    height: 10px;
    background-color: #ccc;
    border-radius: 5px;
    position: relative;
}
</style>