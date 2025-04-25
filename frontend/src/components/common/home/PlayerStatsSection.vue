<template>
    <v-row>
        <v-col cols="12">
            <h3 class="font-weight-bold mb-2">타자 TOP 5</h3>
        </v-col>

        <v-col cols="12" class="d-flex position-relative justify-center">
            <swiper 
                :breakpoints="breakpoints"
                :space-between="20" 
                :modules="modules"
                :navigation="swiperNavigationOptions"
                class="custom-swiper">
                <swiper-slide v-for="(stat, i) in batterStats" :key="i">
                    <StatCard v-if="stat && stat.topPlayers" :stat="stat" />
                </swiper-slide>
            </swiper>
            <div class="swiper-button-next batter"></div>
            <div class="swiper-button-prev batter"></div>
        </v-col>

        <v-col cols="12" class="mt-6">
            <h3 class="font-weight-bold mb-2">투수 TOP 5</h3>
        </v-col>

        <v-col cols="12" class="d-flex position-relative justify-center">
            <swiper 
                :breakpoints="breakpoints"
                :space-between="20" 
                :modules="modules"
                :navigation="swiperNavigationOptions2"
                class="custom-swiper">
                <swiper-slide v-for="(stat, i) in pitcherStats" :key="i">
                    <StatCard v-if="stat && stat.topPlayers" :stat="stat" />
                </swiper-slide>
                <div class="swiper-button-next pitcher"></div>
                <div class="swiper-button-prev pitcher"></div>
            </swiper>
        </v-col>
    </v-row>
</template>

<script setup>
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules';
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import StatCard from '@/components/common/card/StatCard.vue'

const batterStats = [
    {
        key: 'avg',
        label: '타율',
        unit: '',
        topPlayers: [
            { name: '이정후', team: '키움', value: 0.356, image: 'https://via.placeholder.com/56x56?text=이정후' },
            { name: '김현수', team: 'LG', value: 0.342 },
            { name: '손아섭', team: '롯데', value: 0.331 },
            { name: '박건우', team: 'NC', value: 0.325 },
            { name: '강백호', team: 'KT', value: 0.322 },
        ],
    },
    {
        key: 'hr',
        label: '홈런',
        unit: '개',
        topPlayers: [
            { name: '박병호', team: 'KT', value: 31 },
            { name: '최정', team: 'SSG', value: 29 },
            { name: '나성범', team: 'KIA', value: 27 },
            { name: '이대호', team: '롯데', value: 25 },
            { name: '양의지', team: '두산', value: 24 },
        ],
    },
    {
        key: 'rbi',
        label: '타점',
        unit: '점',
        topPlayers: [
            { name: '최형우', team: 'KIA', value: 102 },
            { name: '김재환', team: '두산', value: 99 },
            { name: '박건우', team: 'NC', value: 96 },
            { name: '나성범', team: 'KIA', value: 95 },
            { name: '이정후', team: '키움', value: 93 },
        ],
    },
    {
        key: 'sb',
        label: '도루',
        unit: '개',
        topPlayers: [
            { name: '박찬호', team: 'KIA', value: 34 },
            { name: '김혜성', team: '키움', value: 32 },
            { name: '허경민', team: '두산', value: 29 },
            { name: '이학주', team: '삼성', value: 27 },
            { name: '정주현', team: 'LG', value: 25 },
        ],
    },
]

const pitcherStats = [
    {
        key: 'era',
        label: '평균자책',
        unit: '',
        topPlayers: [
            { name: '양현종', team: 'KIA', value: 1.97 },
            { name: '고우석', team: 'LG', value: 2.13 },
            { name: '안우진', team: '키움', value: 2.20 },
            { name: '김광현', team: 'SSG', value: 2.32 },
            { name: '최원태', team: '키움', value: 2.45 },
        ],
    },
    {
        key: 'win',
        label: '승수',
        unit: '승',
        topPlayers: [
            { name: '안우진', team: '키움', value: 16 },
            { name: '이의리', team: 'KIA', value: 15 },
            { name: '박세웅', team: '롯데', value: 14 },
            { name: '이승헌', team: '롯데', value: 13 },
            { name: '소형준', team: 'KT', value: 13 },
        ],
    },
    {
        key: 'so',
        label: '탈삼진',
        unit: '개',
        topPlayers: [
            { name: '안우진', team: '키움', value: 189 },
            { name: '뷰캐넌', team: '삼성', value: 172 },
            { name: '반즈', team: '롯데', value: 165 },
            { name: '루친스키', team: 'NC', value: 160 },
            { name: '이의리', team: 'KIA', value: 157 },
        ],
    },
    {
        key: 'sv',
        label: '세이브',
        unit: '개',
        topPlayers: [
            { name: '정우람', team: '한화', value: 34 },
            { name: '고우석', team: 'LG', value: 32 },
            { name: '원종현', team: 'NC', value: 31 },
            { name: '김원중', team: '롯데', value: 30 },
            { name: '조상우', team: '키움', value: 29 },
        ],
    },
]

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

const modules = [Navigation];

const swiperNavigationOptions = {
    nextEl: '.swiper-button-next.batter',
    prevEl: '.swiper-button-prev.batter',
};

const swiperNavigationOptions2 = {
    nextEl: '.swiper-button-next.pitcher',
    prevEl: '.swiper-button-prev.pitcher',
};
</script>