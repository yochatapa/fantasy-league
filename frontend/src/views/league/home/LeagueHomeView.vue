<template>
    <v-container>
        <!-- 리그명 + 공유 -->
        <v-row class="align-center mb-6">
            <v-col cols="auto">
                <h1 class="text-h4 font-weight-bold">{{ leagueName }}</h1>
            </v-col>
            <v-col cols="auto" class="pa-0">
                <v-icon @click="copyLink" color="primary" style="cursor: pointer;">
                    mdi-share-variant
                </v-icon>
            </v-col>
        </v-row>
 
        <v-card class="mb-6">
            <v-card-text>
                <v-row class="align-center justify-space-between">
                    <v-col cols="auto">
                        {{ noticeSummary }}
                    </v-col>
                    <v-col cols="auto">
                        <v-icon @click="goToNotices" class="ml-2">mdi-chevron-right</v-icon>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- 메인 영역 -->
        <v-row align="stretch" no-gutters gap="6">
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
        <v-card class="pa-4 mt-6" elevation="2">
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
import { ref, computed, watch, onMounted } from 'vue';
import { useClipboard } from '@vueuse/core';
import { useDisplay } from 'vuetify';

const { copy } = useClipboard();
const { mdAndDown } = useDisplay();

const isMobile = computed(() => mdAndDown.value);

const leagueName = ref('판타지 리그 A');
const currentWeek = ref(5);
const noticeSummary = ref("공지사항 테스트입니다. 다들 주목하세요. 한국의 오타니~ 김혜성~~~!")

// 링크 복사
const copyLink = () => {
    copy(window.location.href);
};

// 매치 데이터
const matches = ref([
    {
        myTeam: '나',
        myScore: 10,
        opponentScore: 5,
        opponentTeam: '상대A',
        myImage: 'https://via.placeholder.com/40x40.png?text=나',
        opponentImage: 'https://via.placeholder.com/40x40.png?text=상대A',
        myRank: 3,
        opponentRank: 5,
        isMe: true
    },
    {
        myTeam: '팀B',
        myScore: 8,
        opponentScore: 9,
        opponentTeam: '팀C',
        myImage: 'https://via.placeholder.com/40x40.png?text=B',
        opponentImage: 'https://via.placeholder.com/40x40.png?text=C',
        myRank: 4,
        opponentRank: 2,
        isMe: false
    },
    {
        myTeam: '팀D',
        myScore: 7,
        opponentScore: 7,
        opponentTeam: '팀E',
        myImage: 'https://via.placeholder.com/40x40.png?text=D',
        opponentImage: 'https://via.placeholder.com/40x40.png?text=E',
        myRank: 6,
        opponentRank: 1,
        isMe: false
    },
]);

// Waiver 기록 데이터
const waiverList = ref([
    { team: '나', type: 'add', player: '손흥민' },
    { team: '나', type: 'drop', player: '박지성' },
    { team: '팀B', type: 'add', player: '이강인' }
]);

const rankings = ref([
    { rank: 1, name: 'Team Alpha', wins: 8, losses: 1 },
    { rank: 2, name: 'Team Bravo', wins: 7, losses: 2 },
    { rank: 3, name: 'Team Charlie', wins: 6, losses: 3 },
    { rank: 4, name: 'Team Delta', wins: 6, losses: 3 },
    { rank: 5, name: 'Team Echo', wins: 5, losses: 4 },
    { rank: 6, name: 'Team Foxtrot', wins: 5, losses: 4 },
    { rank: 7, name: 'Team Golf', wins: 4, losses: 5 },
    { rank: 8, name: 'Team Hotel', wins: 3, losses: 6 },
    { rank: 9, name: 'Team India', wins: 2, losses: 7 },
    { rank: 10, name: 'Team Juliet', wins: 1, losses: 8 },
]);

// 열림 여부
const isDetailsOpen = ref(false);

onMounted(() => {
    if (!isMobile.value) {
        isDetailsOpen.value = true;
    }
});

// 모바일/PC 전환 감지
watch(isMobile, (newVal) => {
    if (!newVal) {
        isDetailsOpen.value = true;
    } else {
        isDetailsOpen.value = false;
    }
});

// 내 경기와 추가 경기 분리
const displayMatches = computed(() => {
    if (isMobile.value && !isDetailsOpen.value) {
        return matches.value.filter(match => match.isMe);
    } else {
        return matches.value.filter(match => match.isMe);
    }
});

const additionalMatches = computed(() => {
    if (isMobile.value && !isDetailsOpen.value) {
        return matches.value.filter(match => !match.isMe);
    } else {
        return matches.value.filter(match => !match.isMe);
    }
});

const toggleDetails = () => {
    isDetailsOpen.value = !isDetailsOpen.value;
};

const goToNotices = () => {
    console.log("hihi")
}
</script>

<style scoped>
h1 {
    margin: 0;
}
</style>
