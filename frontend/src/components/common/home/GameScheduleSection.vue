<template>
    <v-row>
        <v-col cols="12" v-if="gameVisible" class="d-flex justify-space-between align-center">
            <h3 class="font-weight-bold mb-2">경기 일정</h3>
            <div class="d-flex align-center">
                <span class="text-h6 mr-2">{{ formattedDate }}</span>
                <v-menu v-model="calendarOpen" transition="scale-transition" max-width="290" :close-on-content-click="false">
                    <template v-slot:activator="{ props }">
                        <v-btn icon v-bind="props">
                            <v-icon>mdi-calendar</v-icon>
                        </v-btn>
                    </template>
                    <v-date-picker 
                        v-model="selectedDate" 
                        @update:model-value="getMatchupList"
                    </v-date-picker>
                </v-menu>
            </div>
        </v-col>
        
        <v-col cols="12" class="d-flex position-relative justify-center" v-if="gameVisible && gameSchedule?.length > 0">
            <swiper 
                :key="swiperKey"
                :breakpoints="breakpoints" 
                :space-between="20" 
                :modules="modules"
                :navigation="swiperNavigationOptions"
                class="custom-swiper">
                <swiper-slide v-for="(game, i) in gameSchedule" :key="i">
                    <GameCard :game="game" @click="goToGameDetail(game.id)"/>
                </swiper-slide>
            </swiper>
            <div class="swiper-button-next game"></div>
            <div class="swiper-button-prev game"></div>
        </v-col>
        <v-col v-else-if="gameVisible" cols="12">
            <v-card  class="pa-6 d-flex flex-column align-center" elevation="1">
                <v-icon size="48" color="grey">mdi-emoticon-sad-outline</v-icon>
                <div class="text-h6 mt-2 mb-1">오늘 경기 정보가 없습니다.</div>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import GameCard from '@/components/common/card/GameCard.vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules';
import { commonFetch } from '@/utils/common/commonFetch';
import { formatDate } from '@/utils/common/dateUtils.js';
import { useRoute, useRouter } from 'vue-router';
import { encryptData } from '@/utils/common/crypto';
import dayjs from 'dayjs';
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

const gameVisible = ref(false);
const gameSchedule = ref([])

const router = useRouter();
const route = useRoute();

const selectedDate = ref(route.query.date ? dayjs(route.query.date).toDate() : dayjs().toDate());
const formattedDate = ref(route.query.date??formatDate(selectedDate.value));
const calendarOpen = ref(false);

onMounted(async () => {
    await getMatchupList(selectedDate.value);
})

const getMatchupList = async (newVal) => {
    try {
        const res = await commonFetch(`/api/kbo/games/schedule/${formatDate(newVal)}`)
        if(res.success){
            gameSchedule.value = res.data.gameSchedules
            gameVisible.value = true;
        }else throw new Error();
    } catch (e) {
        console.error('경기 일정 데이터를 불러오지 못했습니다:', e)
    }
}

const goToGameDetail = game_id => {
    router.push(`/kbo/game/detail/${encodeURIComponent(encryptData(game_id))}`)
}

const modules = [Navigation];

const swiperNavigationOptions = {
    nextEl: '.swiper-button-next.game',
    prevEl: '.swiper-button-prev.game',
};

const slidesToShow = computed(() => Math.min(gameSchedule.value.length, 5))

const breakpoints = computed(() => ({
    320: {
        slidesPerView: Math.min(slidesToShow.value, 1),
    },
    600: {
        slidesPerView: Math.min(slidesToShow.value, 2),
    },
    800: {
        slidesPerView: Math.min(slidesToShow.value, 3),
    },
    1000: {
        slidesPerView: Math.min(slidesToShow.value, 4),
    },
    1200: {
        slidesPerView: Math.min(slidesToShow.value, 5),
    },
}));

const swiperKey = ref(0);

watch(slidesToShow, () => {
    swiperKey.value++;
});

watch(()=>selectedDate.value, (newVal)=>{
    formattedDate.value = formatDate(newVal)
})
</script>
