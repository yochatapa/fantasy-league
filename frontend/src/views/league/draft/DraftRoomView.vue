<template>
    <v-container fluid class="pa-2 pa-md-4">
        <!-- 드래프트 진행 중 화면 -->
        <template v-if="draftStatus !== 'finished' && draftInfoYn">
            <!-- 상단 정보 -->
            <v-row class="mb-4" align="center" justify="space-between">
                <v-col cols="12" md="8">
                    <h2 class="text-h6 text-md-h5">{{ leagueName }} - {{ seasonYear }} 시즌</h2>
                    <div>라운드 {{ currentRound }} / {{ maxRounds }}</div>
                    <div v-if="draftStatus !== 'waiting'" class="d-flex justify-space-between">
                        <span>현재 픽: <strong>{{ currentUser }}</strong></span>
                        <v-chip color="red" label v-if="isMobile">
                            {{ draftStatus !== 'waiting' ? `남은 시간: ${remainingTime}초` : '시작 전' }}
                        </v-chip>
                    </div>
                    <div v-else class="d-flex justify-space-between">
                        <span>드래프트 시작 전입니다.</span>
                        <v-chip color="red" label v-if="isMobile">
                            {{ draftStatus !== 'waiting' ? `남은 시간: ${remainingTime}초` : '시작 전' }}
                        </v-chip>
                    </div>
                </v-col>
                <v-col cols="12" md="4" class="text-md-right text-center" v-if="!isMobile">
                    <v-chip color="red" label>
                        {{ draftStatus !== 'waiting' ? `남은 시간: ${remainingTime}초` : '시작 전' }}
                    </v-chip>
                </v-col>
            </v-row>

            <v-row>
                <!-- 선수 리스트 -->
                <v-col cols="12" md="8">
                    <v-tabs v-model="activeTab">
                        <v-tab value="B">타자</v-tab>
                        <v-tab value="P">투수</v-tab>
                    </v-tabs>

                    <v-text-field
                        v-model="search"
                        label="선수 검색"
                        append-inner-icon="mdi-magnify"
                        hide-details
                        class="mt-4"
                    />

                    <v-select
                        v-model="positionFilter"
                        :items="filteredPositionOptions"
                        item-title="name"
                        item-value="code"
                        label="포지션 필터"
                        class="mt-2"
                        hide-details
                        multiple
                        chips
                    />

                    <div class="table-wrapper">
                        <v-data-table
                            :headers="activeTab === 'B' ? batterHeaders : pitcherHeaders"
                            :items="filteredPlayers"
                            class="mt-4"
                            @click:row="onPlayerClick"
                            density="compact"
                            fixed-header
                            height="500"
                        >
                            <template #item.select="{ item }">
                                <v-btn
                                    icon
                                    size="small"
                                    color="primary"
                                    @click.stop="onPickClick(item)"
                                    :disabled="!isMyTurn || draftStatus == 'waiting'"
                                >
                                    <v-icon>mdi-check</v-icon>
                                </v-btn>
                            </template>

                            <template #item.name="{ item }">
                                <span>{{ item.name }}</span>
                            </template>
                            <template #item.team="{ item }">
                                <span>{{ item.team }}</span>
                            </template>
                            <template #item.season_position="{ item }">
                                <span>{{ item.season_position }}</span>
                            </template>
                        </v-data-table>
                    </div>
                </v-col>

                <!-- 드래프트 결과 + 팀 셀렉트 -->
                <v-col cols="12" md="4">
                    <v-card class="mb-4">
                        <v-card-title class="text-h6">드래프트 순서</v-card-title>
                        <v-divider />
                        <v-list>
                            <v-list-item
                                v-for="(user, idx) in draftOrder"
                                :key="user.teamId"
                                :class="{ 'bg-blue-lighten-4': idx === currentTurnIndex }"
                            >
                                <v-list-item-title>
                                    {{ idx + 1 }}. {{ user.nickname }}
                                    <v-icon
                                        v-if="connectedUsers.some(u => u.userId === user.userId)"
                                        size="16"
                                        color="green"
                                        class="ml-2"
                                    >mdi-circle</v-icon>
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card>

                    <v-card>
                        <v-card-title class="text-h6 d-flex justify-space-between align-center flex-wrap">
                            드래프트 결과
                            <v-select
                                v-model="selectedTeamId"
                                :items="teamOptions"
                                item-title="label"
                                item-value="value"
                                hide-details
                                dense
                                style="max-width: 160px"
                                class="mt-2 mt-md-0"
                            />
                        </v-card-title>
                        <v-divider />
                        <v-list style="max-height: 400px; overflow-y: auto;">
                            <v-list-item
                                v-for="(player, idx) in selectedTeamPicks"
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
        </template>

        <!-- 드래프트 종료 후 결과 화면 -->
        <template v-else-if="draftInfoYn">
            <v-row class="mb-4">
                <v-col>
                    <h2 class="text-h6 text-md-h5">{{ leagueName }} - {{ seasonYear }} 시즌</h2>
                    <div class="text-subtitle-1 font-weight-medium text-success">드래프트가 종료되었습니다.</div>
                </v-col>
            </v-row>

            <v-row>
                <v-col
                    cols="12"
                    md="4"
                    v-for="team in draftOrder"
                    :key="team.teamId"
                >
                    <v-card class="mb-4" elevation="2">
                        <v-card-title class="text-h6">{{ team.nickname }} 팀</v-card-title>
                        <v-divider />
                        <v-list style="max-height: 400px; overflow-y: auto;">
                            <v-list-item
                                v-for="(player, idx) in draftResults[team.teamId] || []"
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

const isPicking = ref(false);  // 픽 요청 중복 방지 플래그

const teamOptions = computed(() =>
    draftOrder.value.map(d => ({ value: d.teamId, label: d.nickname }))
);

const selectedTeamPicks = computed(() => draftResults.value[selectedTeamId.value] || []);

const isMyTurn = computed(() => {
    const currentTeam = draftOrder.value[currentTurnIndex.value];
    return currentTeam?.userId === user.userId;
});

const rawBatterHeaders = [
    { title: '이름', key: 'name' },
    { title: '팀', key: 'team' },
    { title: '포지션', key: 'season_position' },
    { title: '경기수', key: 'games_played', align: 'center' },
    { title: '타석', key: 'plate_appearances', align: 'center' },
    { title: '타수', key: 'at_bats', align: 'center' },
    { title: '안타', key: 'hits', align: 'center' },
    { title: '1루타', key: 'singles', align: 'center' },
    { title: '2루타', key: 'doubles', align: 'center' },
    { title: '3루타', key: 'triples', align: 'center' },
    { title: '홈런', key: 'home_runs', align: 'center' },
    { title: '타점', key: 'runs_batted_in', align: 'center' },
    { title: '득점', key: 'runs', align: 'center' },
    { title: '볼넷', key: 'walks', align: 'center' },
    { title: '고의4구', key: 'intentional_walks', align: 'center' },
    { title: '사구', key: 'hit_by_pitch', align: 'center' },
    { title: '희생번트', key: 'sacrifice_bunts', align: 'center' },
    { title: '희생플라이', key: 'sacrifice_flies', align: 'center' },
    { title: '도루', key: 'stolen_bases', align: 'center' },
    { title: '병살타', key: 'grounded_into_double_play', align: 'center' },
    { title: '실책', key: 'errors', align: 'center' },
    { title: '잔루', key: 'left_on_base', align: 'center' },
    { title: '플라이아웃', key: 'flyouts', align: 'center' },
    { title: '땅볼아웃', key: 'groundouts', align: 'center' },
    { title: '라인드라이브', key: 'linedrives', align: 'center' },
    { title: '트리플플레이', key: 'triple_play', align: 'center' },
    { title: '도루실패', key: 'caught_stealings', align: 'center' },
    { title: '견제사', key: 'pickoffs', align: 'center' },
    { title: '고의사구', key: 'intentional_base_on_balls', align: 'center' },
    { title: '야수선택', key: 'fielders_choice', align: 'center' },
    { title: '만루홈런', key: 'grand_slams', align: 'center' },
    { title: '솔로홈런', key: 'solo_home_runs', align: 'center' },
    { title: '2점홈런', key: 'two_run_home_runs', align: 'center' },
    { title: '3점홈런', key: 'three_run_home_runs', align: 'center' },
    { title: '결승타점', key: 'go_ahead_rbi', align: 'center' },
    { title: '끝내기', key: 'walk_off', align: 'center' },

    // 비율 스탯
    { title: '타율', key: 'batting_average', align: 'center' },
    { title: '출루율', key: 'on_base_percentage', align: 'center' },
    { title: '장타율', key: 'slugging_percentage', align: 'center' },
    { title: 'OPS', key: 'ops', align: 'center' },
];

const rawPitcherHeaders = [
    { title: '이름', key: 'name' },
    { title: '팀', key: 'team' },
    { title: '포지션', key: 'season_position' },
    { title: '경기수', key: 'games_played', align: 'center' },
    { title: '선발경기', key: 'games_started', align: 'center' },
    { title: '이닝', key: 'outs_pitched_display', align: 'center' },
    { title: '타자 상대', key: 'batters_faced', align: 'center' },
    { title: '투구 수', key: 'pitches_thrown', align: 'center' },
    { title: '피안타', key: 'hits_allowed', align: 'center' },
    { title: '피1루타', key: 'singles_allowed', align: 'center' },
    { title: '피2루타', key: 'doubles_allowed', align: 'center' },
    { title: '피3루타', key: 'triples_allowed', align: 'center' },
    { title: '피홈런', key: 'home_runs_allowed', align: 'center' },
    { title: '실점', key: 'runs_allowed', align: 'center' },
    { title: '자책점', key: 'earned_runs', align: 'center' },
    { title: '볼넷허용', key: 'walks_allowed', align: 'center' },
    { title: '고의4구허용', key: 'intentional_walks_allowed', align: 'center' },
    { title: '사구허용', key: 'hit_batters', align: 'center' },
    { title: '몸에맞는공', key: 'hit_by_pitch_allowed', align: 'center' },
    { title: '고의사구', key: 'intentional_base_on_balls', align: 'center' },
    { title: '탈삼진', key: 'strikeouts', align: 'center' },
    { title: '폭투', key: 'wild_pitches', align: 'center' },
    { title: '보크', key: 'balks', align: 'center' },
    { title: '승', key: 'wins', align: 'center' },
    { title: '패', key: 'losses', align: 'center' },
    { title: '세이브', key: 'saves', align: 'center' },
    { title: '홀드', key: 'holds', align: 'center' },
    { title: '블론세이브', key: 'blown_saves', align: 'center' },
    { title: '플라이아웃', key: 'flyouts', align: 'center' },
    { title: '땅볼아웃', key: 'groundouts', align: 'center' },
    { title: '라인드라이브', key: 'linedrives', align: 'center' },
    { title: '병살유도', key: 'grounded_into_double_play', align: 'center' },
    { title: '트리플플레이', key: 'triple_play', align: 'center' },
    { title: '견제사', key: 'pickoffs', align: 'center' },
    { title: '퀄리티스타트', key: 'quality_start', align: 'center' },
    { title: '완투', key: 'complete_game', align: 'center' },
    { title: '완봉', key: 'shutout', align: 'center' },
    { title: '퍼펙트게임', key: 'perfect_game', align: 'center' },
    { title: '노히트', key: 'no_hit', align: 'center' },

    // 비율 스탯
    { title: 'ERA', key: 'era', align: 'center' },
    { title: '삼진/9이닝', key: 'k_per_9', align: 'center' },
    { title: '볼넷/9이닝', key: 'bb_per_9', align: 'center' },
    { title: '피안타/9이닝', key: 'hits_per_9', align: 'center' },
    { title: 'WHIP', key: 'whip', align: 'center' },
];

// 테이블 헤더: 선택 버튼 포함, enableStats 기준 필터링
const batterHeaders = computed(() => [
    { title: '', key: 'select', align: 'center' }, // 선택 버튼 컬럼
    ...rawBatterHeaders
        .filter(h => ['name', 'team', 'season_position'].includes(h.key) || enableStats.value.includes(h.key))
        .map(h => ({ title: h.title, key: h.key, align: h.align || 'start', value: h.key }))
]);

const pitcherHeaders = computed(() => [
    { title: '', key: 'select', align: 'center' }, // 선택 버튼 컬럼
    ...rawPitcherHeaders
        .filter(h => ['name', 'team', 'season_position'].includes(h.key) || enableStats.value.includes(h.key))
        .map(h => ({ title: h.title, key: h.key, align: h.align || 'start', value: h.key }))
]);

// 필터링된 선수 리스트 계산
const filteredPlayers = computed(() => {
    const pickedPlayerIds = new Set(
        Object.values(draftResults.value)
            .flat()
            .map(p => Number(p.player_id))   // 모두 숫자로 변환
    );

    return allPlayers.value.filter(p => {
        const playerId = Number(p.player_id);  // 비교를 위해 숫자로 변환
        return (
            p.player_type === activeTab.value &&
            (positionFilter.value.length === 0 || positionFilter.value.includes(p.season_position)) &&
            (!search.value || p.name.includes(search.value)) &&
            !pickedPlayerIds.has(playerId)  // 이미 뽑힌 선수 제외
        );
    });
});

// 포지션 필터 옵션 (타자/투수 구분)
const filteredPositionOptions = computed(() => {
    return activeTab.value === 'B'
        ? POSITIONS.filter(pos => pos.code !== 'SP' && pos.code !== 'RP')
        : POSITIONS.filter(pos => pos.code === 'SP' || pos.code === 'RP');
});

const selectedPlayer = ref(null);
function onPlayerClick(player) {
    selectedPlayer.value = player;
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

    isPicking.value = true;  // 요청 시작

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
        isPicking.value = false;  // 요청 종료
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
            socket.value.emit('joinRoom', draftRoomId, {
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
