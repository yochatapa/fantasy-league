<template>
    <v-card class="pa- game-card" elevation="1">
        <!-- 팀 이름 & 로고 (반응형) -->
        <v-row
            class="mb-2 mt-3 game-card-header"
            align="center"
            justify="center"
            no-gutters
        >
            <v-col
                cols="5"
                class="d-flex flex-column align-center my-2 justify-center position-relative"
            >
                <span class="my-team left" v-if="game.favorite_team_id === game.away_team_id">
                    <v-icon color="yellow">mdi-star</v-icon>
                </span>
                <v-img
                    :src="game.away_team_path"
                    alt="Away Team"
                    width="48"
                    height="48"
                    class="mr-2"
                />
                <span class="font-weight-medium game-team-name text-truncate">{{ game.away_team }}</span>
                
            </v-col>
            <v-col cols="2" class="d-flex align-center justify-center">
                <h2 class="font-weight-bold">vs</h2>
            </v-col>
            <v-col
                cols="5"
                class="d-flex flex-column align-center my-2 justify-center position-relative"
            >
                <span class="my-team right" v-if="game.favorite_team_id === game.home_team_id">
                    <v-icon color="yellow">mdi-star</v-icon>
                </span>
                <v-img
                    :src="game.home_team_path"
                    alt="Home Team"
                    width="48"
                    height="48"
                    class="mr-2"
                />
                <span class="font-weight-medium game-team-name text-truncate">{{ game.home_team }}</span>
            </v-col>
        </v-row>

        <!-- 점수 -->
        <div class="text-h6 text-center font-weight-bold mb-1">
            {{ game.away_team_score }} : {{ game.home_team_score }}
        </div>

        <!-- 상태 -->
        <div class="text-caption text-center text-grey-darken-1 mb-2" v-if="game.status!=='playball'">
            {{ GAME_STATUS[game.status] ?? '' }}
        </div>

        <!-- 상태 -->
        <div class="text-caption text-center text-grey-darken-1 mb-2" v-if="game.status==='playball'">
            {{ game.inning??1 }}회 {{ game.inning_half==="bottom"?'말':'초' }}
        </div>

        <!-- 시간 및 장소 -->
        <div class="text-caption text-center text-grey mb-2">
            {{ formatDate(game.game_date) }} {{ game.game_time }}
        </div>
        <div class="text-caption text-center text-grey-darken-1 mb-4">
            장소: {{ STADIUMS.find(sdm => sdm.code === game.location)?.name ?? '' }}
        </div>
    </v-card>
</template>

<script setup>
import dayjs from 'dayjs'
import { STADIUMS, POSITIONS, GAME_STATUS } from '@/utils/code/code.js';

const props = defineProps({
    game: Object
})


const formatDate = (dateString) => {
    return dayjs(dateString).format('YYYY-MM-DD')
}
</script>

<style scoped>
.game-card{
    margin: 2px;
}

.game-team-name {
    font-size: .8rem;
    white-space: nowrap; /* 텍스트 줄바꿈 방지 */
}

.my-team {
    position: absolute;
    top: -.5rem;
}

.my-team.left {
    left: .5rem;
}

.my-team.right {
    right: .5rem;
}
</style>
