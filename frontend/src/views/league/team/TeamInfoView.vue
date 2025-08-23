<template>
    <v-container v-if="isLoadedData">
        <v-row class="align-center mb-6" no-gutters>
            <v-col cols="12" class="d-flex align-center justify-space-between">
                <h1 class="text-h4 font-weight-bold mr-2">{{ myTeamInfo?.team_name }}</h1>
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
    currentSeasonInfo: Object,
    myTeamInfo: Object,
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
const myTeamInfo = ref({});
const draftTeams = ref([]);
const draftRoom = ref({});

const isLoadedData = ref(false);

onMounted(async () => {
    watch(
        () => [
            props.leagueInfo,
            props.currentSeasonInfo,
            props.myTeamInfo
        ],
        async ([
            newLeagueInfo,
            newCurrentSeasonInfo,
            newMyTeamInfo
        ]) => {
            const hasAllData =
            newLeagueInfo &&
            newCurrentSeasonInfo &&
            newMyTeamInfo

            if (hasAllData) {
                leagueInfo.value = newLeagueInfo;
                currentSeasonInfo.value = newCurrentSeasonInfo;
                myTeamInfo.value = newMyTeamInfo;

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
