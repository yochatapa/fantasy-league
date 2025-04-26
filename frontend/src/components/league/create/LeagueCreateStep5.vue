<template>
    <v-container class="text-center py-10" fluid>
        <h1 class="text-h4 font-weight-bold mb-6">🎉 리그 생성 완료!</h1>

        <v-container class="bg-white rounded-lg pa-6 elevation-2" max-width="600">
            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">리그명</v-col>
                <v-col cols="8" class="text-left">{{ leagueName }}</v-col>
            </v-row>
            <v-divider />
            
            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">리그 유형</v-col>
                <v-col cols="8" class="text-left">{{ leagueTypeLabel }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">리그 방식</v-col>
                <v-col cols="8" class="text-left">{{ leagueFormatLabel }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">드래프트 방식</v-col>
                <v-col cols="8" class="text-left">{{ draftMethodLabel }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">공개 여부</v-col>
                <v-col cols="8" class="text-left">{{ isPublic ? '공개' : '비공개' }}</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">최대 팀 수</v-col>
                <v-col cols="8" class="text-left">{{ maxTeams }}팀</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">플레이오프 팀 수</v-col>
                <v-col cols="8" class="text-left">{{ playoffTeams }}팀</v-col>
            </v-row>
            <v-divider />

            <v-row align="center" class="py-4">
                <v-col cols="4" class="text-left font-weight-medium">시즌 시작일</v-col>
                <v-col cols="8" class="text-left">{{ formattedSeasonStartDate }}</v-col>
            </v-row>

            <template v-if="draftMethod !== 'custom'">
                <v-divider />
                <v-row align="center" class="py-4">
                    <v-col cols="4" class="text-left font-weight-medium">드래프트 일자</v-col>
                    <v-col cols="8" class="text-left">{{ formattedDraftDate }}</v-col>
                </v-row>
            </template>
        </v-container>

        <v-btn 
            color="primary" 
            size="large" 
            class="mt-8"
            @click="goToMyLeague"
        >
            내 리그로 이동
        </v-btn>
    </v-container>
</template>

<script setup>
import { computed } from 'vue';
import dayjs from 'dayjs';
import { LEAGUE_TYPES, LEAGUE_FORMATS, DRAFT_METHODS } from '@/utils/code/code';
import { useRouter } from 'vue-router';

const props = defineProps({
    leagueName: String,
    leagueType: String,
    leagueFormat: String,
    draftMethod: String,
    isPublic: Boolean,
    maxTeams: Number,
    playoffTeams: Number,
    seasonStartDate: Date,
    draftDate: Date,
});

const router = useRouter();

const leagueTypeLabel = computed(() => {
    return LEAGUE_TYPES.find(item => item.id === props.leagueType)?.label || '';
});

const leagueFormatLabel = computed(() => {
    return LEAGUE_FORMATS.find(item => item.id === props.leagueFormat)?.label || '';
});

const draftMethodLabel = computed(() => {
    return DRAFT_METHODS.find(item => item.id === props.draftMethod)?.label || '';
});

const formattedSeasonStartDate = computed(() => {
    return dayjs(props.seasonStartDate).format('YYYY.MM.DD');
});

const formattedDraftDate = computed(() => {
    return dayjs(props.draftDate).format('YYYY.MM.DD');
});

const goToMyLeague = () => {
    // TODO: 실제로 생성된 리그 ID를 알면 거기로 이동하게
    router.push('/my-leagues');
};
</script>
