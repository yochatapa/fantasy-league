<template>
    <v-container class="text-center py-10" fluid>
        <h1 class="text-h4 font-weight-bold mb-6">🎉 리그 생성 완료!</h1>

        <v-container class="bg-white rounded-lg pa-6 elevation-2" max-width="600">
            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">리그명</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.league_name }}</v-col>
            </v-row>
            <v-divider />
            
            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">리그 유형</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.leagueTypeLabel }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">리그 방식</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.leagueFormatLabel }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">드래프트 방식</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.draftTypeLabel }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">공개 여부</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.is_public ? '공개' : '비공개' }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">최대 팀 수</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.max_teams }}팀</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">플레이오프 팀 수</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.playoff_teams }}팀</v-col>
            </v-row>
            <v-divider />

            <template v-if="leagueInfo.draftMethod !== 'custom'">
                <v-row align="center" class="py-4">
                    <v-col cols="4" class="text-left font-weight-medium">드래프트 일시</v-col>
                    <v-col cols="8" class="text-left">{{ leagueInfo.draft_start_date }} {{ leagueInfo.draft_start_time }}</v-col>
                </v-row>
                <v-divider />
            </template>

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">시즌 시작일</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.start_date }}</v-col>
            </v-row>            
        </v-container>

        <v-btn 
            color="primary" 
            size="large" 
            class="mt-8 mx-2"
            @click="goToMyLeague"
        >
            리그로 이동
        </v-btn>
        <v-btn 
            color="primary" 
            size="large" 
            class="mt-8 mx-2"
            @click="goToMyHome"
        >
            홈으로 이동
        </v-btn>
    </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { LEAGUE_TYPES, LEAGUE_FORMATS, DRAFT_METHODS } from '@/utils/code/code';
import { useRoute, useRouter } from 'vue-router';
import { encryptData, decryptData } from '@/utils/common/crypto.js';
import { commonFetch } from '@/utils/common/commonFetch';
import { tr } from 'vuetify/locale';

const route = useRoute();
const router = useRouter();

// leagueId와 seasonId를 복호화하여 가져옵니다.
const orgLeagueId = route.query.leagueId;
const orgSeasonId = route.query.seasonId;
let leagueId = null;
let seasonId = null;

try {
    leagueId = decryptData(orgLeagueId);
    seasonId = decryptData(orgSeasonId);
} catch (error) {
    alert("올바르지 않은 경로입니다.");
    router.push("/");
}

if(!leagueId || !seasonId){
    alert("올바르지 않은 경로입니다.");
    router.push("/");
}

// 리그 정보 상태를 저장할 변수
const leagueInfo = ref({
    league_name: '',
    league_type: '',
    league_format: '',
    draft_type: '',
    is_public: false,
    max_teams: 0,
    playoff_teams: 0,
    start_date: '',
    draft_date: '',
    leagueTypeLabel: '',
    leagueFormatLabel: '',
    draftMethodLabel: '',
    formattedSeasonStartDate: '',
    formattedDraftDate: '',
});

// 리그 정보를 가져오는 함수
const loadLeagueInfo = async () => {
    try {
        // fetchLeagueInfo는 서버에서 리그 정보를 받아오는 API 호출 함수입니다.

        Promise.all([
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/info`, {
                method : 'GET'
            }),
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(orgSeasonId)}/info`, {
                method : 'GET'
            })  
        ]).then(([leagueResponse, seasonResponse]) => {
            if(leagueResponse.success && seasonResponse.success){
                const leagueData = leagueResponse.data.leagueInfo;
                const seasonData = seasonResponse.data.seasonInfo;

                const totalData = {...leagueData, ...seasonData}

                leagueInfo.value = {
                    ...totalData,
                    leagueTypeLabel: LEAGUE_TYPES.find(item => item.id === totalData.league_type)?.label || '',
                    leagueFormatLabel: LEAGUE_FORMATS.find(item => item.id === totalData.league_format)?.label || '',
                    draftTypeLabel: DRAFT_METHODS.find(item => item.id === totalData.draft_type)?.label || '',
                    formattedSeasonStartDate: dayjs(totalData.start_date).format('YYYY.MM.DD'),
                    formattedDraftDate: dayjs(totalData.draft_date).format('YYYY.MM.DD'),
                };
            }else{
                alert("리그 정보 조회 도중 문제가 발생하였습니다.");
                router.push("/");
            }
        })
        
    } catch (error) {
        console.error('리그 정보 조회 실패:', error);
    }
};

// 컴포넌트가 마운트될 때 리그 정보를 로드
onMounted(() => {
    loadLeagueInfo();
});

// 리그로 이동
const goToMyLeague = () => {
    router.push({
        path: "/league/home",
        query: {
            leagueId : encryptData(leagueId),
        }
    })
};

const goToMyHome = () => {
    router.push("/")
}
</script>
