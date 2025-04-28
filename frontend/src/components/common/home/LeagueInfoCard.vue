<template>
    <v-row>
        <v-col
            cols="12"
            class="d-flex justify-space-between align-center mb-2"
            v-if="leagues.length > 0 && isLoggedIn && isLoadedData"
        >
            <span class="text-h6 font-weight-bold">내 리그 정보</span>
            <v-btn color="primary" @click="joinLeague">리그 참가하기</v-btn>
        </v-col>

        <v-col
            v-if="leagues.length > 0 && isLoggedIn && isLoadedData"
            v-for="league in leagues"
            :key="league.id"
            cols="12"
            md="6"
        >
            <v-card
                class="pa-4"
                elevation="1"
                @click="goToLeague(league.league_id)"
            >
                <div class="text-subtitle-1 font-weight-medium mb-2">
                    {{ league.league_name }}
                </div>
                <!-- 이번주 순위 or 내 점수 등 추가 예정 -->
                <v-chip color="secondary" class="ma-1" label>
                    순위: {{ league.rank }}위
                </v-chip>
                <v-chip color="success" class="ma-1" label>
                    포인트: {{ league.points }}
                </v-chip>
            </v-card>
        </v-col>
        
        <v-col v-else-if="isLoadedData" cols="12">
            <v-card  class="pa-6 d-flex flex-column align-center" elevation="1">
                <v-icon size="48" color="grey">mdi-emoticon-sad-outline</v-icon>
                <div class="text-h6 mt-2 mb-1">참가한 리그가 없습니다</div>
                <div class="text-body-2 mb-4 text-center">
                    친구들과 함께 리그에 참가하고 순위를 겨뤄보세요!
                </div>
                <v-btn color="primary" @click="joinLeague">리그 참가하러 가기</v-btn>
            </v-card>
        </v-col>
    </v-row>
</template>




<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore'
import { commonFetch } from '@/utils/common/commonFetch';
import { encryptData } from '@/utils/common/crypto'

const userStore = useUserStore();
const router = useRouter();

const isLoggedIn = computed(() => userStore.isLoggedIn);
const isLoadedData = ref(false);

const leagues = ref([
    /*{ id: 1, league_name: '드림리그', rank: 2, points: 1420 },
    { id: 2, league_name: '챌린저스', rank: 5, points: 1280 },
    { id: 3, league_name: '야구왕조', rank: 1, points: 1600 },*/
])

const joinLeague = () => {
    if(isLoggedIn.value) router.push("/league/start")
    else router.push("/login")
}

const goToLeague = (id) => {
    router.push({
        path: "/league/home",
        query: {
            leagueId : encryptData(id),
        }
    })
}

const loadLeagueInfo = async () => {
    try {
        // fetchLeagueInfo는 서버에서 리그 정보를 받아오는 API 호출 함수입니다.
        const response = await commonFetch(`/api/league/list`, {
            method : 'GET'
        });

        if(response.success){            
            if(response.data.leagueInfo) leagues.value =response.data.leagueInfo;
            else leagues.value = [];
        }        
    } catch (error) {
        console.error('리그 정보 조회 실패:', error);
    }finally{
        isLoadedData.value = true;
    }
}

onMounted(() => {
    loadLeagueInfo();
});
</script>
