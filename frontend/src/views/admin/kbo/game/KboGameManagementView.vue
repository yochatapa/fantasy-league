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

    <!-- 매치업 목록과 경기 정보 -->
    <v-row>
        <v-col cols="12" md="4">
            <v-card>
                <v-card-title>매치업 목록</v-card-title>
                <v-divider></v-divider>
                <v-list>
                    <v-list-item 
                        v-for="(matchup, index) in matchups" 
                        :key="index" 
                        @click="selectMatchup(index)"
                    >
                        <v-list-item-title>
                            {{ getTeamName(matchup.away_team_id) }} @ {{ getTeamName(matchup.home_team_id) }}
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            {{ matchup.game_date }} | {{ matchup.game_time }} | {{ matchup.stadium }}
                        </v-list-item-subtitle>
                    </v-list-item>
                </v-list>
                
                <!-- 매치업 추가 폼 -->
                <v-container>
                    <v-row class="mt-4">
                        <v-col cols="6">
                            <v-select
                                v-model="selectedAwayTeam"
                                :items="teamList"
                                item-value="id"
                                item-title="name"
                                label="원정팀"
                            />
                        </v-col>

                        <v-col cols="6">
                            <v-select
                                v-model="selectedHomeTeam"
                                :items="teamList"
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
                                매치업 추가
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-container>
            </v-card>
        </v-col>

        <v-col cols="12" md="4">
            <v-card>
                <v-card-title>경기 정보</v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                    <div v-if="selectedMatchup">
                        <p>📌 <strong>팀:</strong> 
                            {{ getTeamName(selectedMatchup.away_team_id) }} @ 
                            {{ getTeamName(selectedMatchup.home_team_id) }}
                        </p>
                        <p>🏟️ <strong>경기장:</strong> {{ selectedMatchup.stadium }}</p>
                        <p>📅 <strong>날짜:</strong> {{ selectedMatchup.game_date }}</p>
                        <p>🕒 <strong>시간:</strong> {{ selectedMatchup.game_time }}</p>
                    </div>
                    <div v-else>
                        선택된 경기 없음
                    </div>
                </v-card-text>
            </v-card>
        </v-col>

        <v-col cols="12" md="4">
            <v-card>
                <v-card-title>경기 정보</v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                    <div v-if="selectedMatchup">
                        <p>📌 <strong>팀:</strong> 
                            {{ getTeamName(selectedMatchup.away_team_id) }} @ 
                            {{ getTeamName(selectedMatchup.home_team_id) }}
                        </p>
                        <p>🏟️ <strong>경기장:</strong> {{ selectedMatchup.stadium }}</p>
                        <p>📅 <strong>날짜:</strong> {{ selectedMatchup.game_date }}</p>
                        <p>🕒 <strong>시간:</strong> {{ selectedMatchup.game_time }}</p>
                    </div>
                    <div v-else>
                        선택된 경기 없음
                    </div>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { STADIUMS } from '@/utils/code/code.js';
import { formatDate } from '@/utils/common/dateUtils.js';

const selectedDate = ref(new Date());
const formattedDate = ref(formatDate(selectedDate.value));
const calendarOpen = ref(false);
const matchups = ref([]);
const selectedMatchup = ref(null);

const teamList = [
    { id: 1, name: '두산 베어스' },
    { id: 2, name: 'LG 트윈스' },
    { id: 3, name: 'KT 위즈' },
    { id: 4, name: 'NC 다이노스' },
    { id: 5, name: 'SSG 랜더스' },
    { id: 6, name: '한화 이글스' },
    { id: 7, name: '삼성 라이온즈' },
    { id: 8, name: '롯데 자이언츠' },
    { id: 9, name: 'KIA 타이거즈' },
    { id: 10, name: '키움 히어로즈' }
];

const selectedAwayTeam = ref(null);
const selectedHomeTeam = ref(null);
const stadium = ref('');
const gameDate = ref('');
const gameTime = ref('');

const canAddMatchup = computed(() => {
    return (
        selectedAwayTeam.value &&
        selectedHomeTeam.value &&
        stadium.value &&
        gameDate.value &&
        gameTime.value &&
        selectedAwayTeam.value !== selectedHomeTeam.value
    );
});

watch(()=>selectedDate.value, (newVal)=>{
    formattedDate.value = formatDate(newVal)
})

const toggleCalendar = () => {
    calendarOpen.value = !calendarOpen.value;
};

const updateMatchups = () => {
    console.log('경기 목록 업데이트');
};

const selectMatchup = (index) => {
    selectedMatchup.value = matchups.value[index];
};

const addMatchup = () => {
    matchups.value.push({
        away_team_id: selectedAwayTeam.value,
        home_team_id: selectedHomeTeam.value,
        stadium: stadium.value,
        game_date: gameDate.value,
        game_time: gameTime.value
    });

    // 초기화
    selectedAwayTeam.value = null;
    selectedHomeTeam.value = null;
    stadium.value = '';
    gameDate.value = '';
    gameTime.value = '';
};

const getTeamName = (id) => {
    const team = teamList.find(team => team.id === id);
    return team ? team.name : 'Unknown';
};
</script>
