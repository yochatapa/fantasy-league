<template>
    <v-container v-if="isLoadedData">
        <!-- 리그명 + 공유 -->
        <v-row class="align-center mb-6" no-gutters>
            <!-- 리그명 + 공유 버튼 -->
            <v-col cols="12" class="d-flex align-center justify-space-between">
                <h1 class="text-h4 font-weight-bold mr-2">{{ leagueInfo.league_name }}</h1>
                <v-icon @click="copyLink" color="primary" style="cursor: pointer;">
                    mdi-share-variant
                </v-icon>
            </v-col>

            <!-- 시즌 년도 -->
            <v-col cols="12" class="d-flex">
                <v-list dense class="horizontal-list bg-transparent pa-0">
                    <v-list-item
                        v-if="seasonInfo.length === 1"
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

        <!-- 공지사항 -->
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

        <!-- 시즌 일정 -->
        <v-row v-if="currentSeasonInfo.season_status === 'pending'">
            <v-col cols="12">
                <v-card>
                    <v-card-title class="d-flex justify-space-between align-center">
                        시즌 일정
                    </v-card-title>
                    <v-divider></v-divider>
                    <div class="d-flex flex-column align-center position-relative mt-6 mb-2 pt-6 pb-10 mx-10">
                        <!-- 타임라인 바 -->
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

                        <!-- 날짜 라벨 -->
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

        <!-- 드래프트 순번 -->
        <v-row v-if="currentSeasonInfo.season_status === 'pending'">
            <v-col cols="12">
                <v-card>
                    <v-card-title class="d-flex justify-space-between align-center">
                        드래프트 순번
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
                                    <!-- 순번 표시 -->
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

                                    <!-- 팀 아이콘 + 이름 -->
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
        </v-row>

        <!-- 메인 영역 -->
        <v-row align="stretch" no-gutters gap="6" v-if="currentSeasonInfo.season_status !== 'pending'">
            <!-- 이번 주 매치 -->
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
                                <div class="text-subtitle1">{{ match.myTeam }}</div>
                                <div class="text-caption text-grey">{{ match.myRank }}위</div>
                            </v-col>
                            <v-col cols="auto" class="text-center">
                                <div class="text-h6">{{ match.myScore }} : {{ match.opponentScore }}</div>
                            </v-col>
                            <v-col cols="auto" class="text-center">
                                <v-avatar size="40" class="mb-1">
                                    <v-img :src="match.opponentImage" />
                                </v-avatar>
                                <div class="text-subtitle1">{{ match.opponentTeam }}</div>
                                <div class="text-caption text-grey">{{ match.opponentRank }}위</div>
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
                                        <div class="text-subtitle1">{{ match.myTeam }}</div>
                                        <div class="text-caption text-grey">{{ match.myRank }}위</div>
                                    </v-col>
                                    <v-col cols="auto" class="text-center">
                                        <div class="text-h6">{{ match.myScore }} : {{ match.opponentScore }}</div>
                                    </v-col>
                                    <v-col cols="auto" class="text-center">
                                        <v-avatar size="40" class="mb-1">
                                            <v-img :src="match.opponentImage" />
                                        </v-avatar>
                                        <div class="text-subtitle1">{{ match.opponentTeam }}</div>
                                        <div class="text-caption text-grey">{{ match.opponentRank }}위</div>
                                    </v-col>
                                </v-row>
                                <v-divider class="my-4" />
                            </div>
                        </div>
                    </v-expand-transition>
                </v-card>
            </v-col>

            <!-- 리그 순위 -->
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
                            <div class="d-flex align-center justify-space-between">
                                <div class="d-flex align-center">
                                    <span class="text-grey text-caption mr-2">{{ team.rank }}위</span>
                                    <span>{{ team.name }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-body-2 font-weight-medium">{{ team.wins }}승 {{ team.losses }}패</span>
                                </div>
                            </div>
                        </v-list-item>
                    </v-list>
                </v-card>
            </v-col>
        </v-row>

        <!-- Waiver 기록 -->
        <v-card class="pa-4 mt-6" elevation="2" v-if="currentSeasonInfo.season_status !== 'pending'">
            <v-card-title class="text-h6">
                Waiver 기록
            </v-card-title>
            <v-divider class="my-2" />
            <div v-for="(waiver, index) in waiverList" :key="index">
                <v-row class="align-center mb-2">
                    <v-col cols="auto">
                        <v-icon :color="waiver.type === 'add' ? 'green' : 'red'">
                            {{ waiver.type === 'add' ? 'mdi-plus' : 'mdi-minus' }}
                        </v-icon>
                    </v-col>
                    <v-col>
                        {{ waiver.team }} {{ waiver.type === 'add' ? '추가' : '드랍' }} - {{ waiver.player }}
                    </v-col>
                </v-row>
                <v-divider class="my-2" v-if="index !== waiverList.length - 1" />
            </div>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { useDisplay } from 'vuetify';
import { commonFetch } from '@/utils/common/commonFetch';
import { LEAGUE_TYPES, LEAGUE_FORMATS, DRAFT_METHODS } from '@/utils/code/code';
import { encryptData } from '@/utils/common/crypto.js';
import { formatDate, parseDate, differenceInDays } from '@/utils/common/dateUtils.js';

const { copy } = useClipboard();
const { mobile } = useDisplay();

const route = useRoute();
const router = useRouter();

const isMobile = computed(() => mobile.value);

const currentWeek = ref(5);
const noticeSummary = ref("공지사항 테스트입니다. 다들 주목하세요. 한국의 오타니~ 김혜성~~~!");

const orgLeagueId = route.query.leagueId;

const leagueInfo = ref({});
const seasonInfo = ref([]);
const currentSeasonInfo = ref(null);
const filteredSeasonYears = ref([]);
const draftTeams = ref([]);

const seasonYear = ref(null);
watch([seasonInfo,seasonYear],()=>{filteredSeasonYears.value = seasonInfo.value.filter((sy)=>sy.season_year!==seasonYear.value);})

const isLoadedData = ref(false);
const seasonDataYn = ref(false);

const barRef = ref(null)
const barWidth = ref(0)

window.addEventListener('resize', () => {
    if (barRef.value) {
        barWidth.value = barRef.value.offsetWidth
    }
})

// today (1분마다 갱신)
const today = ref(new Date())
setInterval(() => today.value = new Date(), 1000 * 60)

function getDDayText(target) {
    const diff = differenceInDays(target, today.value)
    if (diff === 0) return 'D-Day'
    return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`
}

// 날짜 객체
const draftDate = computed(() => parseDate(currentSeasonInfo.value.draft_start_date+' '+currentSeasonInfo.value.draft_start_time))
const startDate = computed(() => parseDate(currentSeasonInfo.value.start_date + " 00:00"))

const MIN_PIXEL_GAP = 100

const datePercents = computed(() => {
    if (!barWidth.value) barWidth.value = barRef.value?.offsetWidth
    if (!barWidth.value) return []

    const all = [
        { key: 'today', label: '오늘', date: today.value },
        { key: 'draft', label: '드래프트', date: draftDate.value },
        { key: 'start', label: '시즌 시작', date: startDate.value }
    ]

    // 날짜+시간까지 완전 동일할 때만 병합
    const merged = []
    for (const item of all) {
        const existing = merged.find(m => m.date.getTime() === item.date.getTime())
        if (existing) {
            existing.key += `,${item.key}`
            existing.label += `, ${item.label}`
        } else {
            merged.push({ ...item })
        }
    }

    // 날짜순 정렬
    merged.sort((a, b) => a.date.getTime() - b.date.getTime())

    const min = merged[0].date.getTime()
    const max = merged[merged.length - 1].date.getTime()
    const total = max - min || 1

    const raw = merged.map(entry => {
        const percent = ((entry.date.getTime() - min) / total) * 100
        const px = (percent / 100) * barWidth.value
        const hour = entry.date.getHours()
        const minute = entry.date.getMinutes()

        return {
            ...entry,
            percent,
            px,
            ddayText: getDDayText(entry.date),
            formatted: formatDate(entry.date),
            time: `${hour}:${minute.toString().padStart(2, '0')}`
        }
    })

    // 최소 픽셀 간격 보정
    const adjusted = [raw[0]]
    for (let i = 1; i < raw.length; i++) {
        const prev = adjusted[i - 1]
        const current = { ...raw[i] }
        if (current.px - prev.px < MIN_PIXEL_GAP) {
            current.px = prev.px + MIN_PIXEL_GAP
        }
        adjusted.push(current)
    }

    const newMaxPx = adjusted[adjusted.length - 1].px
    adjusted.forEach(item => {
        item.percent = (item.px / newMaxPx) * 100
    })
    
    return adjusted
})


// 링크 복사
const copyLink = () => {
    copy(window.location.origin+`/league/join?inviteCode=${encodeURIComponent(encryptData(leagueInfo.value.invite_code))}`);
    alert("초대코드가 복사되었습니다.")
};

// 매치 데이터
const matches = ref([
    {
        myTeam: '나',
        myScore: 10,
        opponentScore: 5,
        opponentTeam: '상대A',
        myImage: 'https://via.placeholder.com/40x40.png?text=나',
        opponentImage: 'https://via.placeholder.com/40x40.png?text=상대A',
        myRank: 3,
        opponentRank: 5,
        isMe: true
    },
    {
        myTeam: '팀B',
        myScore: 8,
        opponentScore: 9,
        opponentTeam: '팀C',
        myImage: 'https://via.placeholder.com/40x40.png?text=B',
        opponentImage: 'https://via.placeholder.com/40x40.png?text=C',
        myRank: 4,
        opponentRank: 2,
        isMe: false
    },
    {
        myTeam: '팀D',
        myScore: 7,
        opponentScore: 7,
        opponentTeam: '팀E',
        myImage: 'https://via.placeholder.com/40x40.png?text=D',
        opponentImage: 'https://via.placeholder.com/40x40.png?text=E',
        myRank: 6,
        opponentRank: 1,
        isMe: false
    },
]);

// Waiver 기록 데이터
const waiverList = ref([
    { team: '나', type: 'add', player: '손흥민' },
    { team: '나', type: 'drop', player: '박지성' },
    { team: '팀B', type: 'add', player: '이강인' }
]);

const rankings = ref([
    { rank: 1, name: 'Team Alpha', wins: 8, losses: 1 },
    { rank: 2, name: 'Team Bravo', wins: 7, losses: 2 },
    { rank: 3, name: 'Team Charlie', wins: 6, losses: 3 },
    { rank: 4, name: 'Team Delta', wins: 6, losses: 3 },
    { rank: 5, name: 'Team Echo', wins: 5, losses: 4 },
    { rank: 6, name: 'Team Foxtrot', wins: 5, losses: 4 },
    { rank: 7, name: 'Team Golf', wins: 4, losses: 5 },
    { rank: 8, name: 'Team Hotel', wins: 3, losses: 6 },
    { rank: 9, name: 'Team India', wins: 2, losses: 7 },
    { rank: 10, name: 'Team Juliet', wins: 1, losses: 8 },
]);

// 리그 정보를 가져오는 함수
const loadLeagueInfo = async () => {
    try {
        // fetchLeagueInfo는 서버에서 리그 정보를 받아오는 API 호출 함수입니다.
        const response = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/info`, {
            method : 'GET'
        });

        if(response.success){
            const data = response.data.leagueInfo;
            
            leagueInfo.value = {
                ...data,
                leagueTypeLabel: LEAGUE_TYPES.find(item => item.id === data.league_type)?.label || '',
                leagueFormatLabel: LEAGUE_FORMATS.find(item => item.id === data.league_format)?.label || '',
                // draftTypeLabel: DRAFT_METHODS.find(item => item.id === data.draft_type)?.label || '',
                // formattedSeasonStartDate: dayjs(data.start_date).format('YYYY.MM.DD'),
                // formattedDraftDate: dayjs(data.draft_start_date).format('YYYY.MM.DD'),
            };

            seasonInfo.value = response.data.seasonInfo

            if(seasonInfo.value?.length>0){
                seasonYear.value = seasonInfo.value[0].season_year;
                const seasonRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonInfo.value[0].season_id))}/info`);

                if(seasonRes.success){
                    seasonDataYn.value = true;
                    currentSeasonInfo.value = seasonRes.data.seasonInfo
                    draftTeams.value = seasonRes.data.draftTeams
                }
            }
        }else{
            alert("리그 정보 조회 도중 문제가 발생하였습니다.");
            router.push("/");
        }

        
    } catch (error) {
        console.error('리그 정보 조회 실패:', error);
    }finally{
        isLoadedData.value = true;
    }
};

// 열림 여부
const isDetailsOpen = ref(false);

onMounted(() => {
    if (!isMobile.value) {
        isDetailsOpen.value = true;
    }

    loadLeagueInfo();
});

// 모바일/PC 전환 감지
watch(isMobile, (newVal) => {
    if (!newVal) {
        isDetailsOpen.value = true;
    } else {
        isDetailsOpen.value = false;
    }
});

// 내 경기와 추가 경기 분리
const displayMatches = computed(() => {
    if (isMobile.value && !isDetailsOpen.value) {
        return matches.value.filter(match => match.isMe);
    } else {
        return matches.value.filter(match => match.isMe);
    }
});

const additionalMatches = computed(() => {
    if (isMobile.value && !isDetailsOpen.value) {
        return matches.value.filter(match => !match.isMe);
    } else {
        return matches.value.filter(match => !match.isMe);
    }
});

const toggleDetails = () => {
    isDetailsOpen.value = !isDetailsOpen.value;
};

const goToNotices = () => {
    console.log("hihi")
}

const selectDraftSlot = async (order) => {
    try {
        const orderRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(currentSeasonInfo.value.season_id))}/draft-order`,{
            method : "POST"
            , body : {
                order : order
            }            
        })
        
        if(!orderRes.success && orderRes?.data?.code === -1){
            alert(orderRes.message,"error")
        }
    } catch (error) {
        alert("드래프트 순서를 바꾸는 도중 문제가 발생하였습니다.","error");
    }finally{
        await getDraftOrder();
    }
}

const getDraftOrder = async () => {
    const seasonRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonInfo.value[0].season_id))}/info`);

    if(seasonRes.success){
        draftTeams.value = seasonRes.data.draftTeams
    }
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
