<template>
  <CommonLayout
    :menus="menus"
    :leagueInfo="leagueInfo"
    :seasonInfo="seasonInfo"
    :currentSeasonInfo="currentSeasonInfo"
    :draftTeams="draftTeams"
    :draftRoom="draftRoom"
  />
</template>

<script setup>
import CommonLayout from '@/components/common/CommonLayout.vue';
import { useRouter, useRoute } from 'vue-router';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { encryptData } from '@/utils/common/crypto.js';
import { commonFetch } from '@/utils/common/commonFetch';
import { LEAGUE_TYPES, LEAGUE_FORMATS } from '@/utils/code/code';
import { io } from 'socket.io-client';

const route = useRoute();
const router = useRouter();
const orgLeagueId = route.query.leagueId;

const leagueInfo = ref(null);
const seasonInfo = ref([]);
const seasonYear = ref(null);
const seasonDataYn = ref(false);
const currentSeasonInfo = ref(null);
const draftTeams = ref([]);
const draftRoom = ref(null);
const draftResults = ref([]);
const isLoadedData = ref(false);

const socket = ref(null); // 소켓 인스턴스
const currentSocketRoom = ref(null); // 현재 방 ID


const menus = [
    {
        name: '리그 홈',
        path: `/league/home?leagueId=${encodeURIComponent(orgLeagueId)}`,
        subMenu: []
    },
    {
        name: '팀 관리',
        path: '/league/team-management',
        subMenu: [
            { name: '팀 정보', path: '/league/team-management/team-info' },
            { name: '팀 변경', path: '/league/team-management/team-changes' },
            { name: '선수 목록', path: '/league/team-management/players' },
            { name: '코칭스태프', path: '/league/team-management/coaches' }
        ]
    },
    {
        name: '경기 일정',
        path: '/league/schedule',
        subMenu: []
    },
    {
        name: '통계/순위',
        path: '/league/stats',
        subMenu: [
            { name: '개인 순위', path: '/league/stats/player-ranking' },
            { name: '팀 순위', path: '/league/stats/team-ranking' },
            { name: '경기 기록', path: '/league/stats/match-records' },
            { name: '선수 기록 상세', path: '/league/stats/player-records-detail' },
            { name: '팀 기록 상세', path: '/league/stats/team-records-detail' }
        ]
    },
    {
        name: '게시판',
        path: '/league/board',
        subMenu: [
            { name: '공지사항', path: '/league/board/announcements' },
            { name: '자유 게시판', path: '/league/board/free' },
            { name: 'Q&A', path: '/league/board/qa' }
        ]
    },
    {
        name: '자료실',
        path: '/league/resources',
        subMenu: []
    },
    {
        name: '소개',
        path: '/league/about',
        subMenu: [
            { name: '리그 소개', path: '/league/about/intro' },
            { name: '리그 규정', path: '/league/about/rules' }
        ]
    },
    {
        name: '설정 및 관리',
        path: '/league/admin',
        subMenu: [
            { name: '기본 설정', path: '/league/admin/general' },
            { name: '사용자 관리', path: '/league/admin/users' },
            { name: '권한 설정', path: '/league/admin/permissions' },
            { name: '리그 데이터 관리', path: '/league/admin/data' }
        ]
    },
    {
        name: 'FAQ',
        path: '/league/faq',
        subMenu: []
    }
];

// 소켓 이벤트 리스너 등록 함수
const registerSocketEvents = () => {
    if (!socket.value) return;

    // 중복 등록 방지용 이벤트 제거
    socket.value.off('createDraftRoom');
    socket.value.off('draftAlert');

    socket.value.on('createDraftRoom', (payload) => {
        console.log('[소켓] createDraftRoom 수신:', payload);
        // alert(payload.message || '드래프트 룸이 생성되었습니다.');
    });

    socket.value.on('draftAlert', (payload) => {
        console.log('[소켓] draftAlert 수신:', payload);
        // alert(payload.message || '드래프트 시작까지 얼마 남지 않았습니다!');
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


const loadLeagueInfo = async () => {
    try {
        const response = await commonFetch(`/api/league/${encodeURIComponent(orgLeagueId)}/info`, { method: 'GET' });

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
                const seasonRes = await commonFetch(
                    `/api/league/${encodeURIComponent(orgLeagueId)}/season/${encodeURIComponent(encryptData(seasonInfo.value[0].season_id))}/info`
                );

                if (seasonRes.success) {
                    seasonDataYn.value = true;
                    currentSeasonInfo.value = seasonRes.data.seasonInfo;
                    draftTeams.value = seasonRes.data.draftTeams;
                    draftRoom.value = seasonRes.data.draftRoom;
                    draftResults.value = seasonRes.data.draftResults;

                    // ✨ 여기서 소켓 연결을 시작합니다.
                    connectSocketRoom(leagueInfo.value.league_id, currentSeasonInfo.value.season_id);
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

onMounted(() => {
    loadLeagueInfo();
});

onBeforeUnmount(() => {
    if (socket.value && currentSocketRoom.value) {
        socket.value.emit('leaveRoom', currentSocketRoom.value);
        socket.value.disconnect();
        console.log('Socket disconnected on unmount');
    }
});

</script>