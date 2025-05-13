<template>
    <!-- 상단 달력 -->
    <v-row class="mb-4">
        <v-col cols="12" class="d-flex justify-space-between align-center">
            <span class="text-h6 font-weight-bold">KBO 경기 관리</span>
            <div class="d-flex align-center">
                <span class="text-h6 mr-2">{{ formattedDate }}</span>
                <v-menu v-model="calendarOpen" transition="scale-transition" max-width="290">
                    <template v-slot:activator="{ props }">
                        <v-btn icon v-bind="props">
                            <v-icon>mdi-calendar</v-icon>
                        </v-btn>
                    </template>
                    <v-date-picker 
                        v-model="selectedDate" 
                        @update:model-value="updateMatchups">
                    </v-date-picker>
                </v-menu>
            </div>
        </v-col>
    </v-row>

    <!-- 경기 목록과 경기 정보 -->
    <v-row align="stretch">
        <v-col cols="12" md="4">
            <v-card class="h-100">
                <v-card-title>경기 목록</v-card-title>
                <v-divider></v-divider>
                <v-list>
                    <v-list-item 
                        v-for="(matchup, index) in gameList" 
                        :key="index" 
                        @click="selectMatchup(index)"
                        :class="{selected : selectedMatchup?.game_id === matchup.game_id}"
                    >
                        <div class="d-flex justify-space-between align-center mb-4 mt-2">
                            <div>
                                <v-list-item-title>
                                    {{ matchup.away_team_name }} vs {{ matchup.home_team_name }}
                                </v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ matchup.game_date }} | {{ matchup.game_time }} | {{ STADIUMS.find(sdm => sdm.code === matchup.stadium)?.name??'' }}
                                </v-list-item-subtitle>
                            </div>
                            <v-btn icon @click="deleteMatchup(matchup.game_id)">
                                <v-icon>mdi-delete</v-icon>
                            </v-btn>
                        </div> 
                        <v-divider></v-divider>                       
                    </v-list-item>
                </v-list>
                
                <!-- 경기 추가 폼 -->
                <v-container>
                    <v-row>
                        <v-col cols="6">
                            <v-select
                                v-model="selectedAwayTeam"
                                :items="teamList.filter(team=>team.id !== selectedHomeTeam && !gameList.find(game => game.away_team_id === team.id || game.home_team_id === team.id))"
                                item-value="id"
                                item-title="name"
                                label="원정팀"
                            />
                        </v-col>

                        <v-col cols="6">
                            <v-select
                                v-model="selectedHomeTeam"
                                :items="teamList.filter(team=>team.id !== selectedAwayTeam && !gameList.find(game => game.away_team_id === team.id || game.home_team_id === team.id))"
                                item-value="id"
                                item-title="name"
                                label="홈팀"
                            />
                        </v-col>

                        <v-col cols="6">
                            <v-select
                                v-model="stadium"
                                :items="STADIUMS"
                                item-value="code"
                                item-title="name"
                                label="경기장"
                            />
                        </v-col>

                        <v-col cols="6">
                            <v-text-field
                                v-model="gameTime"
                                label="경기 시간"
                                type="time"
                                outlined
                            />
                        </v-col>

                        <v-col cols="12">
                            <v-btn
                                :disabled="!canAddMatchup"
                                @click="addMatchup"
                                color="primary"
                                block
                            >
                                경기 추가
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card>
        </v-col>

        <v-col cols="12" md="8">
            <v-row align="stretch" class="h-100">
                <v-col cols="12">
                    <v-card class="h-100">
                        <v-card-title>경기 정보</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <div v-if="selectedMatchup">
                                <div class="game-header d-flex justify-space-between align-center">
                                    <div class="d-flex align-center">
                                        <img :src="selectedMatchup.away_team_path" alt="Away Team Logo" class="team-logo" />
                                        <span class="text-h6 font-weight-bold">{{ selectedMatchup.away_team_name }}</span>    
                                    </div>
                                    <div class="d-flex align-center">
                                        <span class="team-score"></span>
                                    </div>
                                    <div class="d-flex justify-center flex-column align-center">
                                        <span class="vs">VS</span>
                                    </div>
                                    <div class="d-flex align-center">
                                        <span class="team-score"></span>
                                    </div>
                                    <div class="d-flex align-center">
                                        <span class="text-h6 font-weight-bold">{{ selectedMatchup.home_team_name }}</span>
                                        <img :src="selectedMatchup.home_team_path" alt="Home Team Logo" class="team-logo" />
                                    </div>
                                </div>
                                <div class="d-flex justify-center flex-column align-center">
                                    <p><strong>경기장:</strong> {{ STADIUMS.find(sdm => sdm.code === selectedMatchup.stadium)?.name??'' }}</p>
                                    <p><strong>경기일시:</strong> {{ selectedMatchup.game_date }} {{ selectedMatchup.game_time }}</p>
                                </div>
                            </div>
                            <div v-else class="text-center">
                                <span class="text-h6">선택된 경기가 없습니다.</span>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" md="8">
                    <v-card class="h-100">
                        <v-card-title>경기 정보</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <baseball-stadium></baseball-stadium>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" md="4">
                    <v-card class="h-100">
                        <v-card-title>라인업</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <v-row class="text-center font-bold">
                                <v-col>원정팀</v-col>
                                <v-col>타순</v-col>
                                <v-col>홈팀</v-col>
                            </v-row>
                            
                            <v-row
                                v-for="(lineup, index) in lineupList"
                                :key="index"
                                class="text-center"
                            >
                                <v-divider></v-divider>
                                <v-col>{{ lineup.awayPlayer }}</v-col>
                                <v-col>{{ ((index + 1)%10)===0 ? "투수" : ((index + 1)%10) + "번" }}</v-col>
                                <v-col>{{ lineup.homePlayer }}</v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12">
                    <v-card class="h-100">
                        <v-card-title>경기 정보 등록</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <v-tabs v-model="activeTab">
                                <v-tab value="0">기본 정보</v-tab>
                                <v-tab value="1">라인업 설정</v-tab>
                                <v-tab value="2">라인업 </v-tab>
                                <v-tab value="3">타자 기록 등록</v-tab>
                                <v-tab value="4">투수 기록 등록</v-tab>
                            </v-tabs>

                            <v-window v-model="activeTab">
                                <v-window-item value="0">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <p>기본 정보 화면이 여기에 표시됩니다.</p>
                                            </v-col>
                                        </v-row>
                                    </v-container>
                                </v-window-item>

                                <v-window-item value="1">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <p>라인업 설정 화면이 여기에 표시됩니다.</p>
                                            </v-col>
                                        </v-row>
                                    </v-container>
                                </v-window-item>

                                <v-window-item value="2">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <p>교체 기록 화면이 여기에 표시됩니다.</p>
                                            </v-col>
                                        </v-row>
                                    </v-container>
                                </v-window-item>
                            </v-window>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { STADIUMS, POSITIONS } from '@/utils/code/code.js';
import { commonFetch, getNewFormData } from '@/utils/common/commonFetch';
import { formatDate } from '@/utils/common/dateUtils.js';
import { encryptData, decryptData } from '@/utils/common/crypto.js';
import BaseballStadium from '@/components/kbo/BaseballStadium.vue';

const selectedDate = ref(new Date());
const formattedDate = ref(formatDate(selectedDate.value));
const calendarOpen = ref(false);
const selectedMatchup = ref(null);

const teamList = ref([]);
const gameList = ref([]);
const lineupList = ref(new Array(10).fill(null).map(() => ({ away: [], home: [] })))
const awayTeamInfo = ref([]);
const homeTeamInfo = ref([]);

const activeTab = ref(0);

const selectedAwayTeam = ref(null);
const selectedHomeTeam = ref(null);
const stadium = ref('');
const gameTime = ref('18:30');

const canAddMatchup = computed(() => {
    return (
        selectedAwayTeam.value &&
        selectedHomeTeam.value &&
        stadium.value &&
        gameTime.value &&
        selectedAwayTeam.value !== selectedHomeTeam.value
    );
});

watch(()=>selectedDate.value, (newVal)=>{
    formattedDate.value = formatDate(newVal)
})

watch(()=>selectedHomeTeam.value, newVal => {
    if(newVal) stadium.value = teamList.value.find(team=>team.id===newVal)?.main_stadium
})

const updateMatchups = async (newVal) => {
    try {
        Promise.all([
            getTeamList(newVal.getUTCFullYear())
            , getGameList(formatDate(newVal))
        ]).then(([teamYn, gameYn])=>{
            if(gameYn){

            }
        })
    } catch (error) {
        alert("화면 조회 중 문제가 발생하였습니다.\n 다시 한 번 시도해주세요.","error");
    }
};

const selectMatchup = (index) => {
    selectedMatchup.value = gameList.value[index];
    
    getGameDetailInfo(selectedMatchup.value.game_id)
};

const addMatchup = async () => {
    try {
        const response = await commonFetch("/api/admin/game/create",{
            method : "POST"
            , body : {
                season_year : formattedDate.value.split(".")[0],
                away_team_id: selectedAwayTeam.value,
                home_team_id: selectedHomeTeam.value,
                stadium     : stadium.value,
                game_date   : formattedDate.value,
                game_time   : gameTime.value
            }
        })

        if(response.success){
            selectedAwayTeam.value = null;
            selectedHomeTeam.value = null;
            stadium.value = '';
            gameTime.value = '18:30';
            await getGameList(formattedDate.value);
        }
    } catch (error) {
        
    }
};

const getTeamList = async (year) => {
    try {
        const response = await commonFetch(`/api/admin/team/list?year=${year}`);
        
        if(response.success){
            teamList.value = response.data.teamList
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

const getGameList = async (date) => {
    try {
        const response = await commonFetch(`/api/admin/game/list?gameDate=${date}`)
        
        if(response.success){
            gameList.value = response.data.gameList
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

const deleteMatchup = async (game_id) => {
    if(!await confirm("경기를 삭제하시겠습니까?")) return;
    
    try {
        const response = await commonFetch(`/api/admin/game/delete`,{
            method : "DELETE",
            body : {
                gameId : encryptData(game_id)
            }
        })
        
        if(response.success){
            await getGameList(formattedDate.value)
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

const getGameDetailInfo = async (game_id) => {
    try {
        const response = await commonFetch(`/api/admin/game/${game_id}`)
        
        if(response.success){
            awayTeamInfo.value = response.data.awayTeamInfo
            homeTeamInfo.value = response.data.homeTeamInfo
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

onMounted(async ()=>{
    await updateMatchups(selectedDate.value);
})
</script>

<style scoped>
::v-deep .selected .v-list-item__overlay{
    background-color: currentColor;
    opacity: var(--v-selected-opacity);
}
</style>