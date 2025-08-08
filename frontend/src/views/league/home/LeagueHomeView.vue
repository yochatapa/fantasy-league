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
            <v-col cols="12" v-if="draftRoom?.status !== 'finished'">
                <v-card>
                    <v-card-title class="d-flex justify-space-between align-center">
                        <span>드래프트 순번</span>
                        <v-btn color="primary" v-if="draftRoom && draftRoom?.status !== 'finished'" @click="goToDraftRoom()">입장</v-btn>
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
            <v-col cols="12" v-if="draftRoom && draftRoom?.status === 'finished'">
                <v-card>
                    <v-card-title class="d-flex justify-space-between align-center">
                        <span>드래프트 결과</span>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text>
                        <v-row>
                            <v-col
                                cols="12"
                                md="4"
                                v-for="team in draftTeams"
                                :key="team.team_id"
                            >
                                <v-card class="mb-4" elevation="2">
                                    <v-card-title class="text-h6">{{ team.nickname }} 팀</v-card-title>
                                    <v-divider />
                                    <v-list style="max-height: 400px; overflow-y: auto;">
                                        <v-list-item
                                            v-for="(player, idx) in draftResults[team.team_id] || []"
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { useDisplay } from 'vuetify';
import { commonFetch } from '@/utils/common/commonFetch';
import { LEAGUE_TYPES, LEAGUE_FORMATS } from '@/utils/code/code';
import { encryptData } from '@/utils/common/crypto.js';
import { formatDate } from '@/utils/common/dateUtils.js';
import { io } from 'socket.io-client';

const socket = ref(null); // 소켓 인스턴스
const currentSocketRoom = ref(null); // 현재 방 ID

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
const draftRoom = ref(null);
const draftResults = ref({});

const seasonYear = ref(null);
watch([seasonInfo, seasonYear], () => {
    filteredSeasonYears.value = seasonInfo.value.filter((sy) => sy.season_year !== seasonYear.value);
});

const isLoadedData = ref(false);
const seasonDataYn = ref(false);

const barRef = ref(null);
const barWidth = ref(0);

window.addEventListener('resize', () => {
    if (barRef.value) {
        barWidth.value = barRef.value.offsetWidth;
    }
});

const today = ref(dayjs());
setInterval(() => {
    today.value = dayjs();
}, 1000 * 60);

const draftDate = computed(() => {
    if (!currentSeasonInfo.value || !currentSeasonInfo.value.draft_start_date) return null;
    return dayjs(currentSeasonInfo.value.draft_start_date);
});

const startDate = computed(() => {
    if (!currentSeasonInfo.value || !currentSeasonInfo.value.start_date) return null;
    return dayjs(currentSeasonInfo.value.start_date, 'YYYY.MM.DD');
});

const MIN_PIXEL_GAP = 100;

const getDDayText = (date) => {
    const diff = dayjs(date).startOf('day').diff(today.value.startOf('day'), 'day');
    if (diff > 0) return `D-${diff}`;
    if (diff < 0) return `D+${Math.abs(diff)}`;
    return 'D-Day';
};

const datePercents = computed(() => {
    if (!barWidth.value) barWidth.value = barRef.value?.offsetWidth;
    if (!barWidth.value || !currentSeasonInfo.value) return [];

    const draft = draftDate.value;
    const start = startDate.value;

    if (!draft?.isValid() || !start?.isValid()) return [];

    const all = [
        { key: 'today', label: '오늘', date: today.value },
        { key: 'draft', label: '드래프트', date: draft },
        { key: 'start', label: '시즌 시작', date: start }
    ];

    const merged = [];
    for (const item of all) {
        const existing = merged.find(m => m.date.valueOf() === item.date.valueOf());
        if (existing) {
            existing.key += `,${item.key}`;
            existing.label += `, ${item.label}`;
        } else {
            merged.push({ ...item });
        }
    }

    merged.sort((a, b) => a.date.valueOf() - b.date.valueOf());

    const min = merged[0].date.valueOf();
    const max = merged[merged.length - 1].date.valueOf();
    const total = max - min || 1;

    const raw = merged.map(entry => {
        const percent = ((entry.date.valueOf() - min) / total) * 100;
        const px = (percent / 100) * barWidth.value;
        const hour = entry.date.hour();
        const minute = entry.date.minute();

        return {
            ...entry,
            percent,
            px,
            ddayText: getDDayText(entry.date),
            formatted: formatDate(entry.date),
            time: `${hour}:${minute.toString().padStart(2, '0')}`
        };
    });

    const adjusted = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
        const prev = adjusted[i - 1];
        const current = { ...raw[i] };
        if (current.px - prev.px < MIN_PIXEL_GAP) {
            current.px = prev.px + MIN_PIXEL_GAP;
        }
        adjusted.push(current);
    }

    const newMaxPx = adjusted[adjusted.length - 1].px;
    adjusted.forEach(item => {
        item.percent = (item.px / newMaxPx) * 100;
    });

    return adjusted;
});

const copyLink = () => {
    copy(window.location.origin + `/league/join?inviteCode=${encodeURIComponent(encryptData(leagueInfo.value.invite_code))}`);
    alert("초대 링크가 복사되었습니다.");
};

const matches = ref([]);
const waiverList = ref([]);
const rankings = ref([]);

const loadSeasonData = async () => {
    if (!currentSeasonInfo.value) return;

    const seasonId = currentSeasonInfo.value.season_id;
    const leagueId = leagueInfo.value.league_id;

    try {
        const [matchesRes, waiverRes, rankingsRes] = await Promise.all([
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonId))}/matches`, {
                method: 'GET'
            }),
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonId))}/waivers`, {
                method: 'GET'
            }),
            commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonId))}/rankings`, {
                method: 'GET'
            }),
        ]);

        if (matchesRes.success) {
            matches.value = matchesRes.data.matches || [];
        }

        if (waiverRes.success) {
            waiverList.value = waiverRes.data.waivers || [];
        }

        if (rankingsRes.success) {
            rankings.value = rankingsRes.data.rankings || [];
        }
    } catch (err) {
        console.error('시즌 데이터 로드 실패:', err);
    }
};


const loadLeagueInfo = async () => {
    try {
        const response = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/info`, {
            method: 'GET'
        });

        if (response.success) {
            const data = response.data.leagueInfo;

            leagueInfo.value = {
                ...data,
                leagueTypeLabel: LEAGUE_TYPES.find(item => item.id === data.league_type)?.label || '',
                leagueFormatLabel: LEAGUE_FORMATS.find(item => item.id === data.league_format)?.label || '',
            };

            seasonInfo.value = response.data.seasonInfo;

            if (seasonInfo.value?.length > 0) {
                seasonYear.value = seasonInfo.value[0].season_year;
                const seasonRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonInfo.value[0].season_id))}/info`);

                if (seasonRes.success) {
                    seasonDataYn.value = true;
                    currentSeasonInfo.value = seasonRes.data.seasonInfo;
                    draftTeams.value = seasonRes.data.draftTeams;
                    draftRoom.value = seasonRes.data.draftRoom;
                    draftResults.value = seasonRes.data.draftResults;
                    
                    await loadSeasonData();
                }
            }
        } else {
            alert("리그 정보 조회 도중 문제가 발생하였습니다.");
            router.push("/");
        }

    } catch (error) {
        console.error('리그 정보 조회 실패:', error);
    } finally {
        isLoadedData.value = true;
    }
};

const isDetailsOpen = ref(false);

onMounted(() => {
    if (!isMobile.value) {
        isDetailsOpen.value = true;
    }
    loadLeagueInfo();
});

watch(isMobile, (newVal) => {
    isDetailsOpen.value = !newVal;
});

const displayMatches = computed(() => {
    return matches.value.filter(match => match.isMe);
});

const additionalMatches = computed(() => {
    return matches.value.filter(match => !match.isMe);
});

const toggleDetails = () => {
    isDetailsOpen.value = !isDetailsOpen.value;
};

const goToNotices = () => {
    console.log("hihi");
};

const selectDraftSlot = async (order) => {
    try {
        const orderRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(currentSeasonInfo.value.season_id))}/draft-order`, {
            method: "POST",
            body: {
                order: order
            }
        });

        if (!orderRes.success && orderRes?.data?.code === -1) {
            alert(orderRes.message, "error");
        }
    } catch (error) {
        alert("드래프트 순서를 바꾸는 도중 문제가 발생하였습니다.", "error");
    } finally {
        await getDraftOrder();
    }
};

const getDraftOrder = async () => {
    const seasonRes = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonInfo.value[0].season_id))}/info`);
    if (seasonRes.success) {
        draftTeams.value = seasonRes.data.draftTeams;
    }
};

// 소켓 이벤트 리스너 등록 함수
const registerSocketEvents = () => {
    if (!socket.value) return;

    // 중복 등록 방지용 이벤트 제거
    socket.value.off('createDraftRoom');
    socket.value.off('draftAlert');

    socket.value.on('createDraftRoom', (payload) => {
        console.log('[소켓] createDraftRoom 수신:', payload);
        //alert(payload.message || '드래프트 룸이 생성되었습니다.');
        //getDraftOrder();
    });

    socket.value.on('draftAlert', (payload) => {
        console.log('[소켓] draftAlert 수신:', payload);
        //alert(payload.message || '드래프트 시작까지 얼마 남지 않았습니다!');
    });

    // 모든 이벤트를 콘솔에 찍어 디버깅 도움
    socket.value.onAny((event, ...args) => {
        console.log(`[소켓][onAny] 이벤트명: ${event}, 데이터:`, args);
    });
};

// 소켓 연결 및 방 입장 함수
const connectSocketRoom = (leagueId, seasonId) => {
    const newRoom = `${leagueId}_${seasonId}`;

    if (currentSocketRoom.value === newRoom) return;

    if (!socket.value) {
        socket.value = io(`${import.meta.env.VITE_API_URL}`, {
            autoConnect: false,
        });
    }

    // 기존 방에서 나가기
    if (currentSocketRoom.value) {
        socket.value.emit('leaveRoom', currentSocketRoom.value);
        console.log(`Left room ${currentSocketRoom.value}`);
    }

    currentSocketRoom.value = newRoom;

    if (!socket.value.connected) {
        socket.value.connect();

        socket.value.once('connect', () => {
            console.log('Socket connected:', socket.value.id);
            socket.value.emit('joinRoom', newRoom);
            console.log(`Requested to join room: ${newRoom}`);

            registerSocketEvents();
        });
    } else {
        socket.value.emit('joinRoom', newRoom);
        console.log(`Requested to join room: ${newRoom}`);

        registerSocketEvents();
    }
};

watch(
    [() => leagueInfo.value?.league_id, () => currentSeasonInfo.value?.season_id],
    ([newLeagueId, newSeasonId]) => {
        if (newLeagueId && newSeasonId) {
            connectSocketRoom(newLeagueId, newSeasonId);
            // onSocketEvents() 호출은 registerSocketEvents()로 대체됨
        }
    }
);

onBeforeUnmount(() => {
    if (socket.value && currentSocketRoom.value) {
        socket.value.emit('leaveRoom', currentSocketRoom.value);
        socket.value.disconnect();
        console.log('Socket disconnected on unmount');
    }
});

const goToDraftRoom = () => {
    router.push("/league/draftroom?leagueId="+encodeURIComponent(orgLeagueId)+"&seasonId="+encodeURIComponent(encryptData(currentSeasonInfo.value.season_id)))
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
