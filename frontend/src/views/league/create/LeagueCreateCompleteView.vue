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

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">시즌 시작일</v-col>
                <v-col cols="8" class="text-left">{{ leagueInfo.formattedSeasonStartDate }}</v-col>
            </v-row>

            <template v-if="leagueInfo.draftMethod !== 'custom'">
                <v-divider />
                <v-row align="center" class="py-4">
                    <v-col cols="4" class="text-left font-weight-medium">드래프트 일자</v-col>
                    <v-col cols="8" class="text-left">{{ leagueInfo.formattedDraftDate }}</v-col>
                </v-row>
            </template>
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
import { decryptData } from '@/utils/common/crypto.js';
import { commonFetch } from '@/utils/common/commonFetch';

const route = useRoute();
const router = useRouter();

// leagueId와 seasonId를 복호화하여 가져옵니다.
const orgLeagueId = route.query.leagueId;
const orgSeasonId = route.query.seasonId;
const leagueId = decryptData(orgLeagueId);
const seasonId = decryptData(orgSeasonId);

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
        const response = await commonFetch(`/api/league/info?leagueId=${encodeURIComponent(orgLeagueId)}&seasonId=${encodeURIComponent(orgSeasonId)}`, {
            method : 'GET'
        });

        if(response.success){
            const data = response.data.leagueInfo;
            
            leagueInfo.value = {
                ...data,
                leagueTypeLabel: LEAGUE_TYPES.find(item => item.id === data.league_type)?.label || '',
                leagueFormatLabel: LEAGUE_FORMATS.find(item => item.id === data.league_format)?.label || '',
                draftTypeLabel: DRAFT_METHODS.find(item => item.id === data.draft_type)?.label || '',
                formattedSeasonStartDate: dayjs(data.start_date).format('YYYY.MM.DD'),
                formattedDraftDate: dayjs(data.draft_date).format('YYYY.MM.DD'),
            };

            console.log(leagueInfo.value)
        }else{
            alert("리그 생성 도중 문제가 발생하였습니다.")
            router.push("/");
        }

        
    } catch (error) {
        console.error('리그 정보 조회 실패:', error);
    }
};

// 컴포넌트가 마운트될 때 리그 정보를 로드
onMounted(() => {
    loadLeagueInfo();
});

// 내 리그로 이동
const goToMyLeague = () => {
    leagueInfo.value = {
        leagueName : "hihi"
    }
    //router.replace('/my-leagues');
};

const goToMyHome = () => {
    router.replace("/")
}
</script>
