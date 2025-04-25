<template>
    <v-row>
        <v-col
            cols="12"
            class="d-flex justify-space-between align-center mb-2"
            v-if="leagues.length > 0"
        >
            <span class="text-h6 font-weight-bold">내 리그 정보</span>
            <v-btn color="primary" @click="joinLeague">리그 참가하기</v-btn>
        </v-col>

        <v-col
            v-if="leagues.length > 0"
            v-for="league in leagues"
            :key="league.id"
            cols="12"
            md="6"
        >
            <v-card
                class="pa-4"
                elevation="1"
                @click="goToLeague(league.id)"
            >
                <div class="text-subtitle-1 font-weight-medium mb-2">
                    {{ league.name }}
                </div>
                <v-chip color="secondary" class="ma-1" label>
                    순위: {{ league.rank }}위
                </v-chip>
                <v-chip color="success" class="ma-1" label>
                    포인트: {{ league.points }}
                </v-chip>
            </v-card>
        </v-col>

        <v-col v-else cols="12">
            <v-card class="pa-6 d-flex flex-column align-center" elevation="1">
                <v-icon size="48" color="grey">mdi-emoticon-sad-outline</v-icon>
                <div class="text-h6 mt-2 mb-1">참가한 리그가 없습니다</div>
                <div class="text-body-2 mb-4 text-center">
                    친구들과 함께 리그에 참가하고 순위를 겨뤄보세요!
                </div>
                <v-btn color="primary" @click="joinLeague">리그 참가하러 가기</v-btn>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref } from 'vue'

const leagues = ref([
    /*{ id: 1, name: '드림리그', rank: 2, points: 1420 },
    { id: 2, name: '챌린저스', rank: 5, points: 1280 },
    { id: 3, name: '야구왕조', rank: 1, points: 1600 },*/
])

const joinLeague = () => {
    console.log('리그 참가 페이지로 이동')
}

const goToLeague = (id) => {
    console.log(`리그 상세로 이동: ${id}`)
}
</script>
