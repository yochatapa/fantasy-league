<template>
    <v-card class="pa-4 game-card" elevation="1">
        <!-- 팀 이름 & 로고 -->
        <v-row align="center" justify="space-between" no-gutters class="mb-3 game-card-header">
            <v-col cols="5" class="d-flex align-center">
                <v-avatar size="32" class="mr-2">
                    <v-img :src="game.awayTeamIcon" alt="Away Team" />
                </v-avatar>
                <span class="font-weight-medium game-team-name">{{ game.awayTeam }}</span>
            </v-col>
            <v-col cols="2" class="text-center font-weight-bold">vs</v-col>
            <v-col cols="5" class="d-flex align-center justify-end">
                <span class="font-weight-medium game-team-name mr-2">{{ game.homeTeam }}</span>
                <v-avatar size="32">
                    <v-img :src="game.homeTeamIcon" alt="Home Team" />
                </v-avatar>
            </v-col>
        </v-row>

        <!-- 점수 -->
        <div class="text-h6 text-center font-weight-bold mb-1">
            {{ game.awayScore }} - {{ game.homeScore }}
        </div>

        <!-- 상태 -->
        <div class="text-caption text-center text-grey-darken-1 mb-2">
            <span v-if="game.status === 'scheduled'">경기 전</span>
            <span v-else-if="game.status === 'ongoing'">{{ game.currentInning }}회 초</span>
            <span v-else-if="game.status === 'finished'">경기 종료</span>
        </div>

        <!-- 시간 및 장소 -->
        <v-row>
            <v-col col="12">
                <div class="text-caption text-center text-grey">
                    {{ formatDate(game.gameTime) }}
                </div>
            </v-col>
        </v-row>
        <v-row>
            <v-col col="12">
                <div class="text-caption text-center text-grey-darken-1">
                    장소: {{ game.location }}
                </div>
            </v-col>
        </v-row>
    </v-card>
</template>

<script setup>
import dayjs from 'dayjs'

const props = defineProps({
    game: Object
})


const formatDate = (dateString) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.game-card{
    margin: 2px 1rem;
}

.game-team-name {
    font-size: 1.1rem;
    white-space: nowrap; /* 텍스트 줄바꿈 방지 */
}
</style>
