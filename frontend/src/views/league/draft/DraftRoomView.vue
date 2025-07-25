<template>
    <v-container fluid class="pa-2 pa-md-4">
        <template v-if="draftStatus !== 'finished' && draftInfoYn">
            <v-card class="mb-4 pa-4" elevation="2">
                <v-row align="center" justify="space-between" class="px-2">
                    <v-col cols="12">
                        <h2 class="text-h6 text-md-h5 font-weight-bold text-primary mb-1">
                            {{ leagueName }} - {{ seasonYear }} 시즌 드래프트
                        </h2>
                        <div class="text-subtitle-1 text-medium-emphasis mb-2">
                            <v-icon size="small" class="mr-1">mdi-timer-sand</v-icon>
                            현재 라운드: <strong class="text-blue-darken-2">{{ currentRound }}</strong> / {{ maxRounds }}
                        </div>
                        <div v-if="draftStatus !== 'waiting'" class="d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center">
                            <div class="text-body-1 font-weight-medium">
                                <v-icon size="small" class="mr-1">mdi-account-star</v-icon>
                                현재 픽: <strong :class="{'text-success': isMyTurn, 'text-primary': !isMyTurn}">{{ currentUser }}</strong>
                                <v-chip v-if="isMyTurn" color="green" size="small" label class="ml-2">내 차례!</v-chip>
                                <span v-else-if="picksRemaining>=0" class="ml-2 text-medium-emphasis">({{ picksRemaining }}차례 후 내 차례)</span>
                                <span v-else class="ml-2 text-medium-emphasis">(내 차례 종료!)</span>
                            </div>
                            <v-chip color="red-darken-1" label class="mt-2 mt-sm-0 d-flex align-center justify-center" v-if="isMobile">
                                <v-icon start icon="mdi-alarm"></v-icon>
                                남은 시간: <span class="font-weight-bold">{{ remainingTime }}초</span>
                            </v-chip>
                        </div>
                        <div v-else class="d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center">
                            <div class="text-body-1 text-medium-emphasis">
                                <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
                                드래프트 시작 전입니다.
                            </div>
                            <v-chip color="red-darken-1" label class="mt-2 mt-sm-0" v-if="isMobile">
                                <v-icon start icon="mdi-alarm-off"></v-icon>
                                시작 전
                            </v-chip>
                        </div>
                    </v-col>
                    <v-col cols="12" md="4" class="text-md-right text-center" v-if="!isMobile">
                        <v-chip color="red-darken-1" label size="large" class="py-2 px-4">
                            <v-icon start icon="mdi-alarm"></v-icon>
                            남은 시간: <span class="font-weight-bold text-h6 ml-1">{{ remainingTime }}초</span>
                        </v-chip>
                    </v-col>
                </v-row>
            </v-card>

            <v-row>
                <v-col cols="12" md="8">
                    <v-card elevation="2">
                        <v-tabs v-model="activeTab" grow background-color="blue-grey-lighten-5">
                            <v-tab value="B">
                                <v-icon start>mdi-baseball-bat</v-icon>
                                타자
                            </v-tab>
                            <v-tab value="P">
                                <v-icon start>mdi-baseball</v-icon>
                                투수
                            </v-tab>
                        </v-tabs>

                        <v-card-text>
                            <v-row dense>
                                <v-col cols="12" sm="6">
                                    <v-text-field
                                        v-model="search"
                                        label="선수 이름 검색"
                                        append-inner-icon="mdi-magnify"
                                        clearable
                                        hide-details
                                    />
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <v-select
                                        v-model="positionFilter"
                                        :items="filteredPositionOptions"
                                        item-title="name"
                                        item-value="code"
                                        label="포지션 필터"
                                        hide-details
                                        multiple
                                        chips
                                        closable-chips
                                    />
                                </v-col>
                            </v-row>

                            <div class="table-wrapper mt-4">
                                <v-data-table
                                    :headers="activeTab === 'B' ? batterHeaders : pitcherHeaders"
                                    :items="filteredPlayers"
                                    class="elevation-1 my-custom-data-table"
                                    @click:row="onPlayerClick"
                                    :hover="isMyTurn && draftStatus !== 'waiting'"
                                    no-data-text="선수 목록이 없습니다."
                                    fixed-header
                                    item-key="player_id" 
                                >
                                    <template #item.select="{ item }">
                                        <v-btn
                                            color="primary"
                                            :disabled="!isMyTurn || draftStatus === 'waiting' || isPicking"
                                            @click.stop="onPickClick(item)"
                                            size="small"
                                            icon
                                            variant="tonal"
                                        >
                                            <v-icon>mdi-check</v-icon>
                                            <v-tooltip activator="parent" location="bottom" v-if="isMyTurn && draftStatus !== 'waiting'">
                                                {{ item.name }} 픽하기
                                            </v-tooltip>
                                        </v-btn>
                                    </template>

                                    <template #item.player_info="{ item }">
                                        <div class="d-flex flex-column align-start">
                                            <div class="d-flex align-center flex-wrap text-no-wrap">
                                                <span class="font-weight-medium text-blue-darken-3">{{ item.name }}</span>
                                                <span class="text-caption text-grey-darken-1 ml-1 mr-2">({{ item.team_name }})</span>
                                                <div class="d-flex flex-wrap">
                                                    <v-chip
                                                        v-for="(pos, idx) in item.season_position.split(',')"
                                                        :key="pos + idx"
                                                        size="x-small"
                                                        color="indigo-lighten-4"
                                                        label
                                                        class="mr-1 mb-1"
                                                    >
                                                        <v-icon start :icon="getPositionIcon(pos.trim())"></v-icon>
                                                        {{ pos.trim() }}
                                                    </v-chip>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </v-data-table>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>

                <v-col cols="12" md="4">
                    <v-card class="mb-4" elevation="2">
                        <v-card-title class="text-h6 py-3">
                            <v-icon start>mdi-order-numeric-ascending</v-icon>
                            드래프트 순서
                        </v-card-title>
                        <v-divider />
                        <v-list>
                            <v-list-item
                                v-for="(user, idx) in draftOrder"
                                :key="user.teamId"
                                :class="{ 'bg-light-blue-lighten-5 font-weight-bold': idx === currentTurnIndex }"
                                class="py-2"
                            >
                                <template v-slot:prepend>
                                    <v-avatar size="32" color="blue-grey-lighten-4">
                                        <span class="text-caption font-weight-bold">{{ idx + 1 }}</span>
                                    </v-avatar>
                                </template>
                                <v-list-item-title class="ml-2">
                                    {{ user.teamName }}
                                    <v-chip
                                        v-if="connectedUsers.some(u => u.userId === user.userId)"
                                        color="green-lighten-1"
                                        size="x-small"
                                        class="ml-2"
                                        label
                                    >
                                        <v-icon start icon="mdi-circle-small"></v-icon> 온라인
                                        <v-tooltip activator="parent" location="bottom">현재 접속 중</v-tooltip>
                                    </v-chip>
                                    <v-chip
                                        v-else
                                        color="grey-lighten-1"
                                        size="x-small"
                                        class="ml-2"
                                        label
                                    >
                                        <v-icon start icon="mdi-circle-small"></v-icon> 오프라인
                                        <v-tooltip activator="parent" location="bottom">현재 오프라인</v-tooltip>
                                    </v-chip>
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card>

                    <v-card elevation="2">
                        <v-card-title class="text-h6 d-flex justify-space-between align-center flex-wrap py-3">
                            <div class="d-flex align-center">
                                <v-icon start>mdi-clipboard-list-outline</v-icon>
                                드래프트 결과
                            </div>
                        </v-card-title>
                        <v-divider />
                        <v-list style="max-height: 400px; overflow-y: auto;">
                            <v-list-item>
                                <v-select
                                    v-model="selectedTeamId"
                                    :items="teamOptions"
                                    item-title="label"
                                    item-value="value"
                                    hide-details
                                    class="w-100 mb-2" />
                            </v-list-item>
                            <v-divider></v-divider> <template v-for="(player, idx) in selectedTeamPicks" :key="idx">
                                <v-list-item class="py-2">
                                    <template v-slot:prepend>
                                        <v-avatar color="blue-grey-lighten-4" size="28">
                                            <span class="text-caption font-weight-bold text-blue-darken-3">{{ player.round }}</span>
                                        </v-avatar>
                                    </template>
                                    <v-list-item-title class="font-weight-medium">
                                        {{ player.name }}
                                        <v-chip
                                            class="ml-2"
                                            color="indigo-lighten-4"
                                            label
                                            size="small"
                                        >
                                            <v-icon start :icon="getPositionIcon(player.position)"></v-icon>
                                            {{ player.position }}
                                        </v-chip>
                                    </v-list-item-title>
                                </v-list-item>
                                <v-divider v-if="idx < selectedTeamPicks.length - 1"></v-divider>
                            </template>
                            <v-list-item v-if="selectedTeamPicks.length === 0">
                                <v-list-item-title class="text-center text-medium-emphasis py-4">
                                    선택된 팀의 픽이 없습니다.
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <template v-else-if="draftInfoYn">
            <v-card class="mb-4 pa-4" elevation="2">
                <h2 class="text-h6 text-md-h5 font-weight-bold text-primary mb-4">
                    {{ leagueName }} - {{ seasonYear }} 시즌
                </h2>
                <div class="text-h6 font-weight-medium text-success d-flex align-center">
                    <v-icon start>mdi-check-circle-outline</v-icon>
                    드래프트가 성공적으로 종료되었습니다.
                </div>
            </v-card>

            <v-row>
                <v-col
                    cols="12"
                    sm="6"
                    md="4"
                    v-for="team in draftOrder"
                    :key="team.teamId"
                >
                    <v-card class="mb-4" elevation="3">
                    <v-card-title class="text-h6 py-3 d-flex align-center">
                        <v-avatar size="36" class="mr-2">
                        <v-img :src="team.logoUrl || '/default-team-logo.png'" alt="팀 로고"></v-img>
                        </v-avatar>
                        {{ team.nickname }} 팀 ({{ team.teamName }})
                    </v-card-title>
                    <v-divider />
                    <v-list style="max-height: 400px; overflow-y: auto;">
                        <template v-for="(player, idx) in [...(draftResults[team.teamId] || [])].sort((a, b) => a.round - b.round)" :key="idx">
                        <v-list-item class="py-2">
                            <template v-slot:prepend>
                            <v-avatar color="blue-grey-lighten-4" size="28">
                                <span class="text-caption font-weight-bold text-blue-darken-3">{{ player.round }}</span>
                            </v-avatar>
                            </template>
                            <v-list-item-title class="font-weight-medium">
                            {{ player.name }}
                            <v-chip
                                class="ml-2"
                                color="indigo-lighten-4"
                                label
                                size="small"
                            >
                                <v-icon start :icon="getPositionIcon(player.position)"></v-icon>
                                {{ player.position }}
                            </v-chip>
                            </v-list-item-title>
                        </v-list-item>
                        <v-divider v-if="idx < (draftResults[team.teamId] || []).length - 1"></v-divider>
                        </template>
                        <v-list-item v-if="!draftResults[team.teamId] || draftResults[team.teamId].length === 0">
                        <v-list-item-title class="text-center text-medium-emphasis py-4">
                            선수 픽이 없습니다.
                        </v-list-item-title>
                        </v-list-item>
                    </v-list>
                    </v-card>
                </v-col>
                </v-row>
        </template>
    </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { POSITIONS } from '@/utils/code/code.js';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { io } from 'socket.io-client';
import { decryptData } from '@/utils/common/crypto.js';
import { commonFetch } from '@/utils/common/commonFetch';
import { useDisplay } from 'vuetify';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);

let leagueId = null;
let seasonId = null;
let draftRoomId = null;

const user = userStore.getUser;

const leagueIdEncrypted = route.query.leagueId;
const seasonIdEncrypted = route.query.seasonId;

try {
    if (!leagueIdEncrypted || !seasonIdEncrypted) {
        throw new Error('파라미터 누락');
    }

    leagueId = decryptData(decodeURIComponent(leagueIdEncrypted));
    seasonId = decryptData(decodeURIComponent(seasonIdEncrypted));
    draftRoomId = `${leagueId}-${seasonId}`;
} catch (err) {
    alert('잘못된 접근입니다. 리그/시즌 정보를 확인할 수 없습니다.');
    console.error('[decryptData error]', err, leagueIdEncrypted, seasonIdEncrypted);
    router.push('/league/home?leagueId='+encodeURIComponent(leagueIdEncrypted));
    throw err; // setup 함수 강제 종료
}

// 상태 변수들
const leagueName = ref('');
const seasonYear = ref('');
const currentRound = ref(1);
const draftType = ref('snake')
const maxRounds = ref(10);
const currentUser = ref('');
const remainingTime = ref(30);

const allPlayers = ref([]);
const positionFilter = ref([]);
const search = ref('');
const activeTab = ref('B');

const enableStats = ref([]);

const draftStatus = ref(null);

const draftInfoYn = ref(false);

const draftOrder = ref([]);
const currentTurnIndex = ref(0);
const draftResults = ref({});
const connectedUsers = ref([]);

const selectedTeamId = ref(null);

const isPicking = ref(false);    // 픽 요청 중복 방지 플래그

const teamOptions = computed(() =>
    draftOrder.value.map(d => ({ value: d.teamId, label: d.nickname }))
);

const selectedTeamPicks = computed(() => draftResults.value[selectedTeamId.value] || []);

const isMyTurn = computed(() => {
    const currentTeam = draftOrder.value[currentTurnIndex.value];
    return currentTeam?.userId === user.userId;
});

const picksRemaining = computed(() => {
    const myTurnIndex = draftOrder.value.findIndex(d => d.userId === user.userId);
    if (myTurnIndex === -1) {
        return 0;
    }

    let afterRound, passedPick;

    if(draftType.value === 'linear'){
        passedPick = Math.max(0,currentRound.value-1) * draftOrder.value.length + currentTurnIndex.value + 1

        if(currentTurnIndex.value > myTurnIndex){ // 이미 지나감
            afterRound = Math.min(currentRound.value + 1,maxRounds.value);        
        }else
            afterRound = currentRound.value;
    }else if(draftType.value === 'snake'){
        if(currentRound.value % 2 === 1){ // 정방향
            passedPick = Math.max(0,currentRound.value-1) * draftOrder.value.length + currentTurnIndex.value + 1

            if(currentTurnIndex.value > myTurnIndex){ // 이미 지나감
                afterRound = Math.min(currentRound.value + 1,maxRounds.value);        
            }else
                afterRound = currentRound.value;
        }else{ //역방향
            passedPick = Math.max(0,currentRound.value-1) * draftOrder.value.length + (draftOrder.value.length - currentTurnIndex.value)

            if(currentTurnIndex.value < myTurnIndex){ // 이미 지나감
                afterRound = Math.min(currentRound.value + 1,maxRounds.value);        
            }else
                afterRound = currentRound.value;
        }
    }

    const nextMyPick = (afterRound-1) * draftOrder.value.length + (!(draftType.value==="snake" && afterRound % 2 === 0)?myTurnIndex + 1:(draftOrder.value.length - myTurnIndex))

    return nextMyPick-passedPick
});

const rawBatterHeaders = [
    { title: '선택', key: 'select', align: 'center', sortable: false, fixed: true, width: 80, nowrap: true },    
    { title: '선수 정보', key: 'player_info', align: 'left', fixed: true, width: 350, nowrap: true},    
    // '팀'과 '포지션' 헤더는 이제 'player_info' 슬롯에서 처리하므로 여기서 제거합니다.
    { title: '경기수', key: 'games_played', align: 'center', nowrap: true },    
    { title: '타석', key: 'plate_appearances', align: 'center', nowrap: true },    
    { title: '타수', key: 'at_bats', align: 'center', nowrap: true },    
    { title: '안타', key: 'hits', align: 'center', nowrap: true },    
    { title: '1루타', key: 'singles', align: 'center', nowrap: true },    
    { title: '2루타', key: 'doubles', align: 'center', nowrap: true },    
    { title: '3루타', key: 'triples', align: 'center', nowrap: true },    
    { title: '홈런', key: 'home_runs', align: 'center', nowrap: true },    
    { title: '타점', key: 'runs_batted_in', align: 'center', nowrap: true },    
    { title: '득점', key: 'runs', align: 'center', nowrap: true },    
    { title: '볼넷', key: 'walks', align: 'center', nowrap: true },    
    { title: '고의4구', key: 'intentional_walks', align: 'center', nowrap: true },    
    { title: '사구', key: 'hit_by_pitch', align: 'center', nowrap: true },    
    { title: '희생번트', key: 'sacrifice_bunts', align: 'center', nowrap: true },    
    { title: '희생플라이', key: 'sacrifice_flies', align: 'center', nowrap: true },    
    { title: '도루', key: 'stolen_bases', align: 'center', nowrap: true },    
    { title: '병살타', key: 'grounded_into_double_play', align: 'center', nowrap: true },    
    { title: '실책', key: 'errors', align: 'center', nowrap: true },    
    { title: '잔루', key: 'left_on_base', align: 'center', nowrap: true },    
    { title: '플라이아웃', key: 'flyouts', align: 'center', nowrap: true },    
    { title: '땅볼아웃', key: 'groundouts', align: 'center', nowrap: true },    
    { title: '라인드라이브', key: 'linedrives', align: 'center', nowrap: true },    
    { title: '트리플플레이', key: 'triple_play', align: 'center', nowrap: true },    
    { title: '도루실패', key: 'caught_stealings', align: 'center', nowrap: true },    
    { title: '견제사', key: 'pickoffs', align: 'center', nowrap: true },    
    { title: '고의사구', key: 'intentional_base_on_balls', align: 'center', nowrap: true },    
    { title: '야수선택', key: 'fielders_choice', align: 'center', nowrap: true },    
    { title: '만루홈런', key: 'grand_slams', align: 'center', nowrap: true },    
    { title: '솔로홈런', key: 'solo_home_runs', align: 'center', nowrap: true },    
    { title: '2점홈런', key: 'two_run_home_runs', align: 'center', nowrap: true },    
    { title: '3점홈런', key: 'three_run_home_runs', align: 'center', nowrap: true },    
    { title: '결승타점', key: 'go_ahead_rbi', align: 'center', nowrap: true },    
    { title: '끝내기', key: 'walk_off', align: 'center', nowrap: true },    

    // 비율 스탯
    { title: '타율', key: 'batting_average', align: 'center', nowrap: true },    
    { title: '출루율', key: 'on_base_percentage', align: 'center', nowrap: true },    
    { title: '장타율', key: 'slugging_percentage', align: 'center', nowrap: true },    
    { title: 'OPS', key: 'ops', align: 'center', nowrap: true },    
];

const rawPitcherHeaders = [
    { title: '선택', key: 'select', align: 'center', sortable: false, fixed: true, width: 80, nowrap: true },    
    { title: '선수 정보', key: 'player_info', align: 'left', fixed: true, width: 350, nowrap: true },    
    // '팀'과 '포지션' 헤더는 이제 'player_info' 슬롯에서 처리하므로 여기서 제거합니다.
    { title: '경기수', key: 'games_played', align: 'center', nowrap: true },    
    { title: '선발경기', key: 'games_started', align: 'center', nowrap: true },    
    { title: '이닝', key: 'outs_pitched_display', align: 'center', nowrap: true },    
    { title: '타자 상대', key: 'batters_faced', align: 'center', nowrap: true },    
    { title: '투구 수', key: 'pitches_thrown', align: 'center', nowrap: true },    
    { title: '피안타', key: 'hits_allowed', align: 'center', nowrap: true },    
    { title: '피1루타', key: 'singles_allowed', align: 'center', nowrap: true },    
    { title: '피2루타', key: 'doubles_allowed', align: 'center', nowrap: true },    
    { title: '피3루타', key: 'triples_allowed', align: 'center', nowrap: true },    
    { title: '피홈런', key: 'home_runs_allowed', align: 'center', nowrap: true },    
    { title: '실점', key: 'runs_allowed', align: 'center', nowrap: true },    
    { title: '자책점', key: 'earned_runs', align: 'center', nowrap: true },    
    { title: '볼넷허용', key: 'walks_allowed', align: 'center', nowrap: true },    
    { title: '고의4구허용', key: 'intentional_walks_allowed', align: 'center', nowrap: true },    
    { title: '사구허용', key: 'hit_batters', align: 'center', nowrap: true },    
    { title: '몸에맞는공', key: 'hit_by_pitch_allowed', align: 'center', nowrap: true },    
    { title: '고의사구', key: 'intentional_base_on_balls', align: 'center', nowrap: true },    
    { title: '탈삼진', key: 'strikeouts', align: 'center', nowrap: true },    
    { title: '폭투', key: 'wild_pitches', align: 'center', nowrap: true },    
    { title: '보크', key: 'balks', align: 'center', nowrap: true },    
    { title: '승', key: 'wins', align: 'center', nowrap: true },    
    { title: '패', key: 'losses', align: 'center', nowrap: true },    
    { title: '세이브', key: 'saves', align: 'center', nowrap: true },    
    { title: '홀드', key: 'holds', align: 'center', nowrap: true },    
    { title: '블론세이브', key: 'blown_saves', align: 'center', nowrap: true },    
    { title: '플라이아웃', key: 'flyouts', align: 'center', nowrap: true },    
    { title: '땅볼아웃', key: 'groundouts', align: 'center', nowrap: true },    
    { title: '라인드라이브', key: 'linedrives', align: 'center', nowrap: true },    
    { title: '병살유도', key: 'grounded_into_double_play', align: 'center', nowrap: true },    
    { title: '트리플플레이', key: 'triple_play', align: 'center', nowrap: true },    
    { title: '견제사', key: 'pickoffs', align: 'center', nowrap: true },    
    { title: '퀄리티스타트', key: 'quality_start', align: 'center', nowrap: true },    
    { title: '완투', key: 'complete_game', align: 'center', nowrap: true },    
    { title: '완봉', key: 'shutout', align: 'center', nowrap: true },    
    { title: '퍼펙트게임', key: 'perfect_game', align: 'center', nowrap: true },    
    { title: '노히트', key: 'no_hit', align: 'center', nowrap: true },    

    // 비율 스탯
    { title: 'ERA', key: 'era', align: 'center', nowrap: true },    
    { title: '삼진/9이닝', key: 'k_per_9', align: 'center', nowrap: true },    
    { title: '볼넷/9이닝', key: 'bb_per_9', align: 'center', nowrap: true },    
    { title: '피안타/9이닝', key: 'hits_per_9', align: 'center', nowrap: true },    
    { title: 'WHIP', key: 'whip', align: 'center', nowrap: true },    
];


// 테이블 헤더: 선택 버튼 포함, enableStats 기준 필터링
const batterHeaders = computed(() => [
    { title: '선택', key: 'select', align: 'center', sortable: false, fixed: true, width: 80, nowrap: true },    
    { title: '선수 정보', key: 'player_info', align: 'center', fixed: true, width: 350, sortable: false, nowrap: true,},    
    ...rawBatterHeaders
        .filter(h => !['select', 'player_info'].includes(h.key) && enableStats.value.includes(h.key))
        .map(h => ({ title: h.title, key: h.key, align: 'center', value: h.key, sortable: true, nowrap: true }))    
]);

const pitcherHeaders = computed(() => [
    { title: '선택', key: 'select', align: 'center', sortable: false, fixed: true, width: 80, nowrap: true },    
    { title: '선수 정보', key: 'player_info', align: 'center', fixed: true, width: 350, sortable: false, nowrap: true,},    
    ...rawPitcherHeaders
        .filter(h => !['select', 'player_info'].includes(h.key) && enableStats.value.includes(h.key))
        .map(h => ({ title: h.title, key: h.key, align: 'center', value: h.key, sortable: true, nowrap: true }))    
]);

// 필터링된 선수 리스트 계산
const filteredPlayers = computed(() => {
    const pickedPlayerIds = new Set(
        Object.values(draftResults.value)
            .flat()
            .map(p => Number(p.player_id)) // 모두 숫자로 변환
    );

    return allPlayers.value.filter(p => {
        const playerId = Number(p.player_id); // 비교를 위해 숫자로 변환

        // 1. 선수 타입 필터링 (기존 로직 유지)
        const isCorrectPlayerType = p.player_type === activeTab.value;
        if (!isCorrectPlayerType) {
            return false;
        }

        // 2. 포지션 필터링 로직 개선
        const isPositionMatched = (() => {
            // positionFilter가 비어있으면 모든 포지션을 허용
            if (positionFilter.value.length === 0) {
                return true;
            }

            // p.season_position을 쉼표로 분리하고 각 포지션의 공백을 제거
            const playerPositions = p.season_position.split(',').map(pos => pos.trim());

            // playerPositions 중 하나라도 positionFilter.value에 포함되는지 확인
            return playerPositions.some(pos => positionFilter.value.includes(pos));
        })();

        if (!isPositionMatched) {
            return false;
        }

        // 3. 검색어 필터링 (기존 로직 유지)
        const isSearchMatched = !search.value || p.name.includes(search.value);
        if (!isSearchMatched) {
            return false;
        }

        // 4. 이미 뽑힌 선수 제외 (기존 로직 유지)
        const isNotPicked = !pickedPlayerIds.has(playerId);
        if (!isNotPicked) {
            return false;
        }

        // 모든 필터를 통과하면 true 반환
        return true;
    });
});

// 포지션 필터 옵션 (타자/투수 구분)
const filteredPositionOptions = computed(() => {
    return activeTab.value === 'B'
        ? POSITIONS.filter(pos => pos.code !== 'SP' && pos.code !== 'RP')
        : POSITIONS.filter(pos => pos.code === 'SP' || pos.code === 'RP');
});

const selectedPlayer = ref(null);
function onPlayerClick(event, { item }) {
    selectedPlayer.value = item;
}

// 소켓
const socket = ref(null);

// 선수 픽 클릭 이벤트
const onPickClick = async (player) => {
    if (!isMyTurn.value) {
        alert('지금은 본인의 차례가 아닙니다.');
        return;
    }

    if (isPicking.value) {
        // 이미 요청 중이면 클릭 무시
        return;
    }

    isPicking.value = true;     // 요청 시작

    try {
        const currentTeam = draftOrder.value[currentTurnIndex.value];
        const teamId = currentTeam?.teamId;

        const res = await commonFetch(
            `/api/league/${encodeURIComponent(leagueIdEncrypted)}/season/${encodeURIComponent(seasonIdEncrypted)}/draftroom/pick`,
            {
                method: 'POST',
                body: {
                    playerId: player.player_id,
                    teamId
                }
            }
        );

        if (!res.success) {
            alert(res.message || '픽 처리 중 오류가 발생했습니다.');
        } else {
            selectedPlayer.value = null;
        }
    } catch (err) {
        console.error('[onPickClick error]', err);
        alert('선수 픽 요청 중 오류가 발생했습니다.');
    } finally {
        isPicking.value = false;     // 요청 종료
    }
};

// 포지션에 따른 아이콘 매핑 함수
const getPositionIcon = (position) => {
  switch (position) {
    case 'C':
    case '1B':
    case '2B':
    case '3B':
    case 'SS':
    case 'LF':
    case 'CF':
    case 'RF':
      return 'mdi-baseball-bat'; // 타자 (내야수, 외야수 모두 방망이 아이콘)
    case 'SP':
    case 'RP':
      return 'mdi-baseball'; // 투수 (선발, 구원 모두 야구공 아이콘)
    default: return 'mdi-account-circle'; // 기본 아이콘
  }
};

// 초기 데이터 로드 및 소켓 연결
onMounted(async () => {
    try {
        const res = await commonFetch(
            `/api/league/${encodeURIComponent(leagueIdEncrypted)}/season/${encodeURIComponent(seasonIdEncrypted)}/draftroom/info`,
            { method: 'GET' }
        );

        if (!res.success) {
            alert('드래프트 정보를 불러오는 중 문제가 발생했습니다.');
            router.push(`/league/home?leagueId=${encodeURIComponent(leagueIdEncrypted)}`);
            return;
        }

        draftInfoYn.value = true;

        const data = res.data;
        draftType.value = data.draftRoom.draft_type;
        leagueName.value = data.league.league_name;
        seasonYear.value = data.season.season_year;
        allPlayers.value = data.players;
        enableStats.value = data.enabledStats || [];
        draftStatus.value = data.draftRoom?.status;
        maxRounds.value = data.draftRoom?.max_rounds;

        draftOrder.value = data.draftOrder.map(d => ({
            teamId: d.team_id,
            draftOrder: d.draft_order,
            isAutoDraft: d.is_auto_draft,
            userId: d.user_id,
            nickname: d.nickname,
            teamName: d.team_name,
            logoUrl: d.logo_url,
        }));

        draftResults.value = data.draftResults || {};

        // 현재 로그인 유저 팀으로 기본 선택
        const myTeam = draftOrder.value.find(t => t.userId === user.userId);
        selectedTeamId.value = myTeam?.teamId || draftOrder.value[0]?.teamId;

        // 소켓 연결
        socket.value = io(`${import.meta.env.VITE_API_URL}`, {
            transports: ['websocket'],
        });

        socket.value.on('connect', () => {
            console.log('[socket] connected:', socket.value.id);
            socket.value.emit('joinDraftRoom', draftRoomId, {
                leagueId,
                seasonId,
                userId : user.userId
            });
        });

        socket.value.on('draft:update', data => {
            remainingTime.value = data.remainingTime;
            currentTurnIndex.value = data.currentIndex;
            currentUser.value = data.currentUser;
            currentRound.value = data.currentRound;
            draftResults.value = data.draftResults;
            draftStatus.value = data.draftStatus;
            connectedUsers.value = data.connectedUsers;
        });

        socket.value.on('draft:playerList', data => {
            allPlayers.value = data.players;
        });

        socket.value.on('draft:order', order => {
            draftOrder.value = order.map(d => ({
                teamId: d.team_id,
                draftOrder: d.draft_order,
                isAutoDraft: d.is_auto_draft,
                userId: d.user_id,
                nickname: d.nickname,
                teamName: d.team_name,
                logoUrl: d.logo_url,
            }));
        });

        socket.value.on('draft:end', () => {
            alert('드래프트가 종료되었습니다.');
            draftStatus.value = 'finished';
        });

        socket.value.on('disconnect', reason => {
            console.log('[socket] disconnected:', reason);
            // alert('서버와의 연결이 끊겼습니다. 홈으로 이동합니다.'); // 사용자에게 알림
            router.push(`/league/home?leagueId=${encodeURIComponent(leagueIdEncrypted)}&seasonId=${encodeURIComponent(seasonIdEncrypted)}`);
        });

    } catch (error) {
        alert('드래프트 정보를 불러오는 중 오류가 발생했습니다.');
        console.error(error);
        router.push(`/league/home?leagueId=${encodeURIComponent(leagueIdEncrypted)}`);
    }
});

// 컴포넌트 종료 시 소켓 연결 해제
onBeforeUnmount(() => {
    socket.value?.disconnect();
});
</script>

<style scoped>
/* Vuetify 기본 스타일을 최대한 활용하므로 최소한의 커스텀 CSS만 추가합니다. */
.table-wrapper {
    /* 테이블 고정 헤더 스크롤 시 그림자 효과 등을 위해 필요할 수 있습니다. */
    border-radius: 4px; /* v-data-table과 일관된 모서리 */
    overflow: hidden; /* 모서리 둥글게 처리 */
}

/* 현재 턴 강조 효과를 위한 클래스 */
.bg-light-blue-lighten-5 {
    background-color: #e3f2fd !important; /* light-blue-lighten-5 */
}

/* 컴포넌트 내부에 스타일을 정의하거나, 전역 CSS 파일에 추가 */
.my-custom-data-table .v-data-table__td:nth-child(1),
.my-custom-data-table .v-data-table__th:nth-child(1) {
  /* '선택' 컬럼 */
  min-width: 80px;
  width: 80px;
}

.my-custom-data-table .v-data-table__td:nth-child(2),
.my-custom-data-table .v-data-table__th:nth-child(2) {
  /* '이름' 컬럼 (선택 다음 두 번째 컬럼) */
  min-width: 300px; /* 필요한 최소 너비 설정 */
  width: 300px; /* 명시적 너비 설정 (min-width와 같거나 크게) */
  max-width: 400px; /* 너무 길어지는 것을 방지 (선택적) */
  white-space: normal; /* 텍스트가 셀 너비에 맞게 줄바꿈되도록 허용 */
}

/* 추가적으로 fixed 컬럼이 다른 컬럼 위에 제대로 겹치도록 z-index를 조정할 필요가 있을 수 있습니다. */
.my-custom-data-table .v-data-table__td--fixed-left,
.my-custom-data-table .v-data-table__th--fixed-left {
  z-index: 3 !important; /* 다른 fixed 컬럼보다 높게 설정 */
  background-color: white; /* 고정된 셀의 배경색이 투명하지 않도록 */
}

/* 첫 번째 컬럼 (선택)의 z-index를 더 높게 */
.my-custom-data-table .v-data-table__td:nth-child(1),
.my-custom-data-table .v-data-table__th:nth-child(1) {
  z-index: 4 !important;
}

/* Vuetify가 fixed 컬럼에 주는 padding을 재정의해야 할 수도 있습니다. */
.my-custom-data-table .v-data-table__tr > .v-data-table__td--fixed-left + .v-data-table__td:not(.v-data-table__td--fixed-left) {
    padding-left: 0; /* 또는 적절한 값으로 조정 */
}
.my-custom-data-table .v-data-table__tr > .v-data-table__th--fixed-left + .v-data-table__th:not(.v-data-table__th--fixed-left) {
    padding-left: 0; /* 또는 적절한 값으로 조정 */
}
</style>