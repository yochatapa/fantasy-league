<template>
    <v-row>
        <!-- 뉴스 제목 -->
        <v-col
            cols="12"
            class="d-flex justify-space-between align-center mb-2"
            v-if="newsList.length > 0"
        >
            <span class="text-h6 font-weight-bold">최신 KBO 뉴스</span>
        </v-col>

        <!-- 뉴스 카드 리스트 -->
        <v-col
            v-if="newsList.length > 0"
            v-for="(news, index) in newsList"
            :key="index"
            cols="12"
            md="6"
        >
            <v-card class="pa-4" elevation="1" @click="goToNews(news.link)">
                <v-row>
                    <!-- 이미지 -->
                    <v-col cols="4">
                        <v-img
                            :src="news.image"
                            alt="뉴스 이미지"
                            aspect-ratio="1"
                            class="news-image"
                        />
                    </v-col>

                    <!-- 뉴스 내용 -->
                    <v-col cols="8" class="d-flex flex-column justify-space-between">
                        <div>
                            <v-list-item-title class="text-subtitle-1 font-weight-medium mb-1 news-title">
                                {{ news.title }}
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-grey text-caption">
                                {{ news.source }} · {{ formatDate(news.date) }}
                            </v-list-item-subtitle>
                        </div>
                    </v-col>
                </v-row>
            </v-card>
        </v-col>

        <!-- 뉴스가 없을 때 -->
        <v-col v-else cols="12">
            <v-card class="pa-6 d-flex flex-column align-center" elevation="1">
                <v-icon size="48" color="grey">mdi-emoticon-sad-outline</v-icon>
                <div class="text-h6 mt-2 mb-1">뉴스가 없습니다</div>
                <div class="text-body-2 mb-4 text-center">
                    최신 KBO 뉴스가 없습니다. 잠시 후 다시 확인해주세요.
                </div>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'

const newsList = ref([
    {
        title: '김하성, 오늘 경기 3타수 2안타 활약! 한국의 오타니 김혜성~! 진짜 길게 써본다 길어도 괜찮나 보자 더 길게 더 길게 써보자 테스트중이야!',
        source: 'OSEN',
        date: '2025-04-24',
        link: 'https://news.example.com/article1',
        image: 'https://via.placeholder.com/150',
    },
    {
        title: 'LG, 한화 꺾고 5연승 질주',
        source: '스포츠조선',
        date: '2025-04-23',
        link: 'https://news.example.com/article2',
        image: 'https://via.placeholder.com/150',
    },
    {
        title: 'SSG 마운드 무너졌다, NC에 대패',
        source: 'MK스포츠',
        date: '2025-04-22',
        link: 'https://news.example.com/article3',
        image: 'https://via.placeholder.com/150',
    },
])

const formatDate = (date) => {
    return dayjs(date).format('YYYY.MM.DD')
}

const goToNews = (link) => {
    window.open(link, '_blank')
}
</script>

<style scoped>
.v-card .v-col .news-title {
    display: -webkit-box !important;
    line-clamp: 2 !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    line-height: 1.5em;
    max-height: 3em;
    word-break: break-word;
    white-space: normal;
}

.news-image {
    border: 1px solid #ccc;
    border-radius: 8px;
    object-fit: cover;
}

/* 카드 내부 패딩 조정 (선택 사항) */
.v-card .v-row .v-col {
    padding: 8px;
}
</style>