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

        <v-col cols="12" md="8" v-if="selectedMatchup">
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
                <v-col cols="12" md="7">
                    <v-card class="h-100">
                        <v-card-title>경기 정보</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <baseball-stadium></baseball-stadium>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" md="5">
                    <v-card class="h-100">
                        <v-card-title>라인업</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <v-row class="text-center font-bold">
                                <v-col>원정팀</v-col>
                                <span class="py-3">타순</span>
                                <v-col>홈팀</v-col>
                            </v-row>
                            <v-row
                                v-for="(lineup, index) in lineupList"
                                :key="index"
                                class="d-flex align-center text-center"
                            >
                                <v-divider></v-divider>
                                <v-col><span v-for="(away, aIdx) in lineupList[((index + 1)%10)]?.away">
                                    {{ lineupList[((index + 1)%10)]?.away?.[0]?.position?'(':'' }}{{ lineupList[((index + 1)%10)]?.away?.[0]?.position }}{{ lineupList[((index + 1)%10)]?.away?.[0]?.position?') ':'' }}{{ lineupList[((index + 1)%10)]?.away?.[0]?.player_name }}
                                </span></v-col>
                                <span class="py-3">{{ ((index + 1)%10)===0 ? "투수" : ((index + 1)%10) + "번" }}</span>
                                <v-col class="d-flex flex-column">
                                    <span v-for="(home, aIdx) in lineupList[((index + 1)%10)]?.home">
                                        {{ (home?.replaced_position??home?.position)?'(':'' }}{{ (home?.replaced_position??home?.position) }}{{ (home?.replaced_position??home?.position)?') ':'' }}{{ home?.replaced_player_name??home?.player_name }}
                                    </span>
                                </v-col>
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
                                <v-tab value="0">라인업 설정</v-tab>
                                <v-tab value="1">타자 기록 등록</v-tab>
                                <v-tab value="2">투수 기록 등록</v-tab>
                            </v-tabs>

                            <v-window v-model="activeTab">
                                <v-window-item value="0">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <v-row>
                                                    <v-col cols="12">
                                                        <span class="text-h6">선수 선택</span>
                                                    </v-col>
                                                    <!-- 팀 선택 -->
                                                    <v-col cols="12" md="3">
                                                        <v-select
                                                            v-model="lineup.team_id"
                                                            :items="teams"
                                                            label="팀 선택"
                                                            item-value="id"
                                                            item-title="name"
                                                            :rules="[v => !!v || '팀을 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>

                                                    <!-- 타순 선택 -->
                                                    <v-col cols="12" md="3">
                                                        <v-select
                                                            v-model="lineup.batting_order"
                                                            :items="battingOrders"
                                                            item-title="name"
                                                            item-value="code"
                                                            label="타순"
                                                            :rules="[v => (v!==null && v!==undefined) || '타순을 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>

                                                    <!-- 선수 선택 -->
                                                    <v-col cols="12" md="3">
                                                        <v-select
                                                            :disabled="isReplace"
                                                            v-model="lineup.player_id"
                                                            :items="!!!lineupTeam?[]:activeRoster.filter(ar => {
                                                                if(lineupList[lineup.batting_order]?.[lineupTeam]?.length>0){
                                                                    if(lineupList[lineup.batting_order]?.[lineupTeam]?.find(ll=>(ll.replaced_by??ll.player_id) === ar.player_id)) return true
                                                                    else return false
                                                                }else{
                                                                    let hasPlayer = false;
                                                                    for(let idx=0;idx<lineupList.length;idx++){
                                                                        if(lineupList[idx]?.[lineupTeam]?.find(ll => (ll.replaced_by??ll.player_id) === ar.player_id)){
                                                                            hasPlayer = true;
                                                                            break;
                                                                        }
                                                                    }
                                                                    
                                                                    if(hasPlayer) return false
                                                                    else return true
                                                                }
                                                            })?.toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                            item-title="player_name"
                                                            item-value="player_id"
                                                            label="선수 선택"
                                                            :rules="[v => !!v || '선수를 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>

                                                    <v-col cols="12" md="3">
                                                        <v-select 
                                                            :disabled="isReplace"
                                                            v-model="lineup.position"
                                                            :items="POSITIONS.toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                            item-title="name"
                                                            item-value="code"
                                                            label="포지션"
                                                            :rules="[v => !!v || '포지션을 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>
                                                </v-row>
                                                <v-divider class="mb-4"></v-divider>
                                                <v-row v-if="isReplace">
                                                    <v-col cols="12">
                                                        <span class="text-h6">교체 선수 선택</span>
                                                    </v-col>
                                                    <v-col cols="12" md="3">
                                                        <v-select
                                                            v-model="lineup.replaced_position"
                                                            :items="POSITIONS.filter(pr=>{
                                                                if(lineup.batting_order === 0){
                                                                    return pr.player_type === 'P'
                                                                }
                                                                return true
                                                            }).toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                            item-title="name"
                                                            item-value="code"
                                                            label="교체 포지션"
                                                            :rules="[v => !!v || '교체 포지션을 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>

                                                    <!-- 교체 선수 선택 -->
                                                    <v-col cols="12" md="3">
                                                        <v-select
                                                            v-model="lineup.replaced_by"
                                                            :items="activeRoster.filter(ar => {
                                                                if(ar.player_id === lineup.player_id) return true
                                                                let hasPlayer = false;
                                                                for(let idx=0;idx<lineupList.length;idx++){
                                                                    if(lineupList[idx]?.[lineupTeam]?.find(ll => (ll.replaced_by??ll.player_id) === ar.player_id)){
                                                                        hasPlayer = true;
                                                                        break;
                                                                    }
                                                                }
                                                                
                                                                if(hasPlayer) return false
                                                                else return true
                                                            })?.toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                            item-title="player_name"
                                                            item-value="player_id"
                                                            label="교체 선수"
                                                            :rules="[v => !!v || '교체 선수를 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>

                                                    <!-- 이닝 선택 -->
                                                    <v-col cols="12" md="3">
                                                        <v-select
                                                            v-model="lineup.replaced_inning"
                                                            :items="innings"
                                                            label="이닝"
                                                            :rules="[v => !!v || '이닝을 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>

                                                    <!-- 아웃 카운트 선택 -->
                                                    <v-col cols="12" md="3">
                                                        <v-select
                                                            v-model="lineup.replaced_out"
                                                            :items="outs"
                                                            label="아웃 카운트"
                                                            :rules="[v => (v!==null && v!==undefined) || '아웃 카운트를 선택해 주세요.']"
                                                            required
                                                        />
                                                    </v-col>
                                                </v-row>
                                                <v-row>
                                                    <!-- 저장 버튼 -->
                                                    <v-col cols="12" class="d-flex justify-end">
                                                        <v-btn :disabled="!lineupValid" color="primary" @click="saveRoster">저장</v-btn>
                                                    </v-col>
                                                </v-row>
                                            </v-col>
                                        </v-row>
                                    </v-container>
                                </v-window-item>
                                <v-window-item value="2">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <p>타자 기록 화면이 여기에 표시됩니다.</p>
                                            </v-col>
                                        </v-row>
                                    </v-container>
                                </v-window-item>
                                <v-window-item value="3">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <p>투수 기록 화면이 여기에 표시됩니다.</p>
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
        <v-col cols="12" md="8" v-else>
            <v-card class="h-100 d-flex justify-center align-center">
                <v-card-title>선택된 경기가 없습니다.</v-card-title>
            </v-card>
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
import { tr } from 'vuetify/locale';

const selectedDate = ref(new Date());
const formattedDate = ref(formatDate(selectedDate.value));
const calendarOpen = ref(false);
const selectedMatchup = ref(null);

const teamList = ref([]);
const gameList = ref([]);
const lineupList = ref(new Array(10).fill(null).map(() => ({ away: [], home: [] })))
const awayTeamInfo = ref([]);
const homeTeamInfo = ref([]);
const awayTeamRosterInfo = ref([]);
const homeTeamRosterInfo = ref([]);
const activeRoster = ref([])

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

const lineupTeam = ref(null);
const isReplace = ref(false);
const lineupValid = computed(() => {
    if(!isReplace.value){
        return  lineup.value.team_id        !== null && lineup.value.team_id        !== undefined &&
                lineup.value.player_id      !== null && lineup.value.player_id      !== undefined &&
                lineup.value.batting_order  !== null && lineup.value.batting_order  !== undefined &&
                lineup.value.position       !== null && lineup.value.position       !== undefined
    }else{
        return  lineup.value.team_id        !== null && lineup.value.team_id        !== undefined &&
                lineup.value.player_id      !== null && lineup.value.player_id      !== undefined &&
                lineup.value.batting_order  !== null && lineup.value.batting_order  !== undefined &&
                lineup.value.position       !== null && lineup.value.position       !== undefined &&
                lineup.value.replaced_by    !== null && lineup.value.replaced_by    !== undefined &&
                lineup.value.replaced_inning!== null && lineup.value.replaced_inning!== undefined &&
                lineup.value.replaced_out   !== null && lineup.value.replaced_out   !== undefined &&
                lineup.value.position       !== null && lineup.value.position       !== undefined
    }
});
const lineup = ref({
    team_id: null,
    player_id: null,
    replaced_by: null,
    batting_order: null,
    replaced_inning: null,
    replaced_out: null,
    replaced_position : null,
    position : null,
});

const teams = ref([]);
const battingOrders = new Array(10).fill(null).map((val,idx) => ({ code :  (idx+1)%10 , name : (idx+1)%10 === 0 ? "투수" : (idx+1)%10 + "번 타자"}))
const roles = ['starter', 'bench', 'substitute'];
const innings = Array.from({ length: 12 }, (_, i) => i + 1); // 1~12회
const outs = [0, 1, 2];

watch(()=>selectedMatchup.value, (newVal) => {
    if(newVal)
        teams.value = [
            {
                id : newVal.away_team_id
                , name : newVal.away_team_name
            },
            {
                id : newVal.home_team_id
                , name : newVal.home_team_name
            }
        ]
    else teams.value = [];
})

watch(()=>selectedDate.value, (newVal)=>{
    formattedDate.value = formatDate(newVal)
})

watch(()=>selectedHomeTeam.value, newVal => {
    if(newVal) stadium.value = teamList.value.find(team=>team.id===newVal)?.main_stadium
})

watch(()=>lineup.value.team_id,(newVal) => {
    lineupTeam.value = !!!newVal?null:(selectedMatchup.value.away_team_id === newVal?"away":(selectedMatchup.value.home_team_id === newVal?"home":null))
    activeRoster.value = !!!lineupTeam.value?[]:(lineupTeam.value === "away"?awayTeamRosterInfo.value:homeTeamRosterInfo.value)

    const lineupPlayer = lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.[lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.length-1];
    if(lineupPlayer){
        lineup.value.player_id = lineupPlayer.replaced_by??lineupPlayer.player_id
        lineup.value.position = lineupPlayer.replaced_position??lineupPlayer.position
        isReplace.value = true;
    }
    else{
        lineup.value.player_id = null
        lineup.value.position = null
        isReplace.value = false;
    }
}) 

watch(()=>lineup.value.batting_order,(newVal)=>{
    const lineupPlayer = lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.[lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.length-1];
    if(lineupPlayer){
        lineup.value.player_id = lineupPlayer.replaced_by??lineupPlayer.player_id
        lineup.value.position = lineupPlayer.replaced_position??lineupPlayer.position
        isReplace.value = true;
    }
    else{
        lineup.value.player_id = null
        lineup.value.position = null
        isReplace.value = false;
    }
})

watch(()=>lineup.value.player_id,(newVal)=>{
    if(!lineup.value.position){
        lineup.value.position = activeRoster.value.find(ar=>ar.player_id === newVal)?.primary_position
    }
})

watch(()=>awayTeamInfo.value, (newVal)=>{
    newVal.forEach(val => {
        if(val.batting_order === null || val.batting_order === undefined) return;
        lineupList.value[val.batting_order]?.["away"].push(val)
    })
})

watch(()=>homeTeamInfo.value, (newVal)=>{
    newVal.forEach(val => {
        if(val.batting_order === null || val.batting_order === undefined) return;
        lineupList.value[val.batting_order]?.["home"].push(val)
    })
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
            selectedMatchup.value = null;
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

const clearLineup = () => {
     lineup.value = {
        team_id: null,
        player_id: null,
        replaced_by: null,
        batting_order: null,
        replaced_inning: null,
        replaced_out: null,
        replaced_position : null,
        position : null,
    }
}

const getGameDetailInfo = async (game_id) => {
    try {
        lineupList.value = new Array(10).fill(null).map(() => ({ away: [], home: [] }));
        clearLineup();
        const response = await commonFetch(`/api/admin/game/${game_id}`)
        await getRosterDetailInfo(selectedMatchup.value.away_team_id,selectedMatchup.value.home_team_id);
        if(response.success){
            awayTeamInfo.value = response.data.awayTeamInfo
            homeTeamInfo.value = response.data.homeTeamInfo
        }else{
            awayTeamInfo.value = [];
            homeTeamInfo.value = [];
            throw new Error();
        }

        return true
    } catch (error) {
        
    }
}

const getRosterDetailInfo = async (awayTeamId, homeTeamId) => {
    try {
        Promise.all([
            commonFetch(`/api/admin/roster/${awayTeamId}?date=${formattedDate.value}`)
            , commonFetch(`/api/admin/roster/${homeTeamId}?date=${formattedDate.value}`)
        ]).then(([awayRes, homeRes])=>{
            if(awayRes.success){
                awayTeamRosterInfo.value = awayRes.data.rosterInfo
            }else throw new Error();

            if(homeRes.success){
                homeTeamRosterInfo.value = homeRes.data.rosterInfo
            }else throw new Error();
        })

        return true
    } catch (error) {
        
    }
}

const saveRoster = async () => {
    try {
        const response = await commonFetch("/api/admin/game/roster/create",{
            method : "POST"
            , body : {
                ...lineup.value
                , game_id : selectedMatchup.value.game_id
                , isReplace : isReplace.value
            }
        })

        if(response.success){
            clearLineup();
            getGameDetailInfo(selectedMatchup.value.game_id)
        }
    } catch (error) {
        
    }
};

const deleteItem = () => {
    console.log('삭제할 데이터:', item.value.id);
};

onMounted(async ()=>{
    await updateMatchups(selectedDate.value);
})
</script>

<style scoped>
:deep(.selected .v-list-item__overlay){
    background-color: currentColor;
    opacity: var(--v-selected-opacity);
}
</style>