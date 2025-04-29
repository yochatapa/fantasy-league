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
                        v-if="seasonYears.length === 1"
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

        <!-- 메인 영역 -->
        <v-row align="stretch" no-gutters gap="6">
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
        <v-card class="pa-4 mt-6" elevation="2">
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

const { copy } = useClipboard();
const { mobile } = useDisplay();

const route = useRoute();
const router = useRouter();

const isMobile = computed(() => mobile.value);

const currentWeek = ref(5);
const noticeSummary = ref("공지사항 테스트입니다. 다들 주목하세요. 한국의 오타니~ 김혜성~~~!");

const orgLeagueId = route.query.leagueId;

const leagueInfo = ref({});
const seasonYears = ref([]);
const filteredSeasonYears = ref([]);

const seasonYear = ref(null);
watch([seasonYears,seasonYear],()=>{filteredSeasonYears.value = seasonYears.value.filter((sy)=>sy.season_year!==seasonYear.value); console.log(filteredSeasonYears.value)})

const isLoadedData = ref(false);

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
        const response = await commonFetch(`/api/league/info?leagueId=${encodeURIComponent(orgLeagueId)}`, {
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
                // formattedDraftDate: dayjs(data.draft_date).format('YYYY.MM.DD'),
            };

            seasonYears.value = response.data.seasonYear
            seasonYear.value = seasonYears.value[0].season_year;
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
</script>

<style scoped>
h1 {
    margin: 0;
}
</style>
