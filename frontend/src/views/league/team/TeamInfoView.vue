<template>
    <v-container v-if="isLoadedData">
        <v-row class="align-center mb-6" no-gutters>
            <v-col cols="12" class="d-flex align-center justify-space-between">
                <h1 class="text-h4 font-weight-bold mr-2">{{ leagueInfo?.league_name }}</h1>
                <v-icon color="primary" style="cursor: pointer;">
                    mdi-share-variant
                </v-icon>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { useDisplay } from 'vuetify';
import { commonFetch } from '@/utils/common/commonFetch';
import { LEAGUE_TYPES, LEAGUE_FORMATS, TRANSACTION_TYPE } from '@/utils/code/code';
import { encryptData } from '@/utils/common/crypto.js';
import { formatDate } from '@/utils/common/dateUtils.js';

const props = defineProps({
    menus: Array,
    leagueInfo: Object,
    seasonInfo: Object,
    currentSeasonInfo: Object,
    draftTeams: Array,
    draftRoom: Object
});

const { copy } = useClipboard();
const { mobile } = useDisplay();

const route = useRoute();
const router = useRouter();

const isMobile = computed(() => mobile.value);

const orgLeagueId = route.query.leagueId;

// props 값을 담을 변수들
const leagueInfo = ref({});
const seasonInfo = ref([]);
const currentSeasonInfo = ref({});
const draftTeams = ref([]);
const draftRoom = ref({});

const isLoadedData = ref(false);

onMounted(async () => {
    watch(
        () => [
            props.leagueInfo,
            props.seasonInfo,
            props.currentSeasonInfo,
            props.draftTeams,
            props.draftRoom
        ],
        async ([
            newLeagueInfo,
            newSeasonInfo,
            newCurrentSeasonInfo,
            newDraftTeams,
            newDraftRoom
        ]) => {
            const hasAllData =
            newLeagueInfo &&
            Array.isArray(newSeasonInfo) && newSeasonInfo.length > 0 &&
            newCurrentSeasonInfo &&
            Array.isArray(newDraftTeams) &&
            newDraftRoom !== undefined; // draftRoom은 null도 올 수 있으니 undefined만 배제

            if (hasAllData) {
                leagueInfo.value = newLeagueInfo;
                seasonInfo.value = newSeasonInfo;
                currentSeasonInfo.value = newCurrentSeasonInfo;
                draftTeams.value = newDraftTeams;
                draftRoom.value = newDraftRoom;

                isLoadedData.value = true;
            } else {
                // 데이터 부족할 때 초기화 (옵션)
                isLoadedData.value = false;
            }
        },
        { immediate: true }
    );
});
</script>