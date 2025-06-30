<template>
    <v-row>
        <v-col cols="12" v-if="gameVisible">
            <h3 class="font-weight-bold mb-2">경기 일정</h3>
        </v-col>

        <v-col cols="12" class="d-flex position-relative justify-center" v-if="gameVisible">
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
import { ref, onMounted } from 'vue'
import GameCard from '@/components/common/card/GameCard.vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules';
import { commonFetch } from '@/utils/common/commonFetch';
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

const gameVisible = ref(false);
const gameSchedule = ref([])

onMounted(async () => {
    try {
        const res = await commonFetch('/api/kbo/games/schedule')
        if(res.success){
            gameSchedule.value = res.data.gameSchedules
            if(gameSchedule.value?.length > 0) gameVisible.value = true;
        }else throw new Error();
    } catch (e) {
        console.error('경기 일정 데이터를 불러오지 못했습니다:', e)
    }
})

const modules = [Navigation];

const swiperNavigationOptions = {
    nextEl: '.swiper-button-next.game',
    prevEl: '.swiper-button-prev.game',
};

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
