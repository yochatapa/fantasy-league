<template>
    <v-row>
        <v-col cols="12" v-if="batterVisible">
            <h3 class="font-weight-bold mb-2">타자 TOP 5</h3>
        </v-col>

        <v-col cols="12" class="d-flex position-relative justify-center" v-if="batterVisible">
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

        <v-col cols="12" class="mt-6" v-if="pitcherVisible">
            <h3 class="font-weight-bold mb-2">투수 TOP 5</h3>
        </v-col>

        <v-col cols="12" class="d-flex position-relative justify-center" v-if="pitcherVisible">
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
import { ref, onMounted } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules';
import { commonFetch } from '@/utils/common/commonFetch';
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import StatCard from '@/components/common/card/StatCard.vue'

onMounted(async ()=>{
    await fetchTopStats();
})

const batterVisible = ref(false);
const pitcherVisible = ref(false);
const batterStats = ref([])
const pitcherStats = ref([]);

const fetchTopStats = async () => {
    try {
        const [batterRes, pitcherRes] = await Promise.all([
            commonFetch(`/api/kbo/top/5/batter`),
            commonFetch(`/api/kbo/top/5/pitcher`),
        ])

        if (batterRes.success) {
            batterStats.value = batterRes.data?.topPlayers
            if(batterStats.value?.length > 0) batterVisible.value = true;
        } else {
            throw new Error('batter 실패')
        }

        if (pitcherRes.success) {
            pitcherStats.value = pitcherRes.data?.topPlayers
            if(pitcherStats.value?.length > 0) pitcherVisible.value = true;
        } else {
            throw new Error('pitcher 실패')
        }

    } catch (err) {
        console.error('TOP5 불러오기 실패:', err)
    }
}

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