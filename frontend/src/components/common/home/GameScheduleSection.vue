<template>
    <v-row>
        <v-col cols="12">
            <h3 class="font-weight-bold mb-2">경기 일정</h3>
        </v-col>

        <v-col cols="12" class="d-flex position-relative justify-center">
            <swiper 
                :breakpoints="breakpoints" 
                :space-between="20" 
                :modules="modules"
                :navigation="swiperNavigationOptions"
                class="custom-swiper">
                <swiper-slide v-for="(game, i) in gameSchedule" :key="i">
                    <GameCard :game="game"/>
                </swiper-slide>
            </swiper>
            <div class="swiper-button-next game"></div>
            <div class="swiper-button-prev game"></div>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref } from 'vue'
import GameCard from '@/components/common/card/GameCard.vue'

const gameSchedule = ref([
    {
        homeTeam: '키움',
        awayTeam: 'LG',
        gameTime: '2025-04-26T18:00:00',
        homeTeamIcon: 'https://via.placeholder.com/30x30?text=키움',
        awayTeamIcon: 'https://via.placeholder.com/30x30?text=LG',
        homeScore: 3,
        awayScore: 5,
        location: '고척 스카이돔',
        status: 'scheduled',
        currentInning: null,
    },
    {
        homeTeam: '삼성',
        awayTeam: 'KIA',
        gameTime: '2025-04-26T19:00:00',
        homeTeamIcon: 'https://via.placeholder.com/30x30?text=삼성',
        awayTeamIcon: 'https://via.placeholder.com/30x30?text=KIA',
        homeScore: 4,
        awayScore: 2,
        location: '대구 삼성 라이온즈 파크',
        status: 'ongoing',
        currentInning: 5,
    },
    {
        homeTeam: '롯데',
        awayTeam: 'SSG',
        gameTime: '2025-04-27T14:00:00',
        homeTeamIcon: 'https://via.placeholder.com/30x30?text=롯데',
        awayTeamIcon: 'https://via.placeholder.com/30x30?text=SSG',
        homeScore: 7,
        awayScore: 6,
        location: '사직야구장',
        status: 'finished',
        currentInning: null,
    },
    {
        homeTeam: '롯데',
        awayTeam: 'SSG',
        gameTime: '2025-04-27T14:00:00',
        homeTeamIcon: 'https://via.placeholder.com/30x30?text=롯데',
        awayTeamIcon: 'https://via.placeholder.com/30x30?text=SSG',
        homeScore: 7,
        awayScore: 6,
        location: '사직야구장',
        status: 'finished',
        currentInning: null,
    },
    {
        homeTeam: '롯데',
        awayTeam: 'SSG',
        gameTime: '2025-04-27T14:00:00',
        homeTeamIcon: 'https://via.placeholder.com/30x30?text=롯데',
        awayTeamIcon: 'https://via.placeholder.com/30x30?text=SSG',
        homeScore: 7,
        awayScore: 6,
        location: '사직야구장',
        status: 'finished',
        currentInning: null,
    },
])

const breakpoints = {
    // 화면 크기에 따라 슬라이드 개수를 조정
    320: {
        slidesPerView: 1,  // 작은 화면에서는 1개씩
    },
    600: {
        slidesPerView: 2,  // 중간 화면에서는 2개씩
    },
    900: {
        slidesPerView: 3,  // 큰 화면에서는 3개씩
    },
    1200: {
        slidesPerView: 4,  // 더 큰 화면에서는 4개씩
    },
}
</script>

<script>
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules';
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

const modules = [Navigation];

const swiperNavigationOptions = {
    nextEl: '.swiper-button-next.game',
    prevEl: '.swiper-button-prev.game',
};
</script>
