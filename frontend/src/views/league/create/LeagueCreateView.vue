<template>
    <v-container class="py-10" fluid>
        <v-stepper v-model="step" class="mx-auto">
            <v-stepper-header>
                <v-stepper-item
                    v-for="(label, index) in stepLabels"
                    :key="index"
                    :value="index + 1"
                    :style="mobile && index !== step - 1 ? 'display:none' : ''"
                >
                    {{ label }}
                </v-stepper-item>
            </v-stepper-header>

            <v-stepper-window>
                <v-stepper-window-item class="pa-1" :value="1">
                    <LeagueCreateStep1 v-model="leagueName" ref="step1Ref" />
                </v-stepper-window-item>
                <v-stepper-window-item class="pa-1" :value="2">
                    <LeagueCreateStep2 v-model:leagueType="leagueType" v-model:leagueFormat="leagueFormat" ref="step2Ref" />
                </v-stepper-window-item>
                <v-stepper-window-item class="pa-1" :value="3">
                    <LeagueCreateStep3 v-model:draftMethod="draftMethod" />
                </v-stepper-window-item>
                <v-stepper-window-item class="pa-1" :value="4">
                    <LeagueCreateStep4 
                        v-model:draftMethod="draftMethod"
                        v-model:isPublic="isPublic"
                        v-model:maxTeams="maxTeams"
                        v-model:playoffTeams="playoffTeams"
                        v-model:seasonStartDate="seasonStartDate"
                        v-model:draftDate="draftDate"
                        v-model:draftTime="draftTime"
                    />
                </v-stepper-window-item>
                <v-stepper-window-item class="pa-1" :value="5">
                </v-stepper-window-item>
            </v-stepper-window>

            <v-stepper-actions 
                class="mt-6" 
                :style="step === stepLabels.length ? 'display:none' : ''"
                @click:prev="handlePrev"
                @click:next="handleNext"
            />
        </v-stepper>
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '@/stores/userStore'
import { useDisplay } from 'vuetify'
import dayjs from 'dayjs';
import LeagueCreateStep1 from '@/components/league/create/LeagueCreateStep1.vue';
import LeagueCreateStep2 from '@/components/league/create/LeagueCreateStep2.vue';
import LeagueCreateStep3 from '@/components/league/create/LeagueCreateStep3.vue';
import LeagueCreateStep4 from '@/components/league/create/LeagueCreateStep4.vue';
import { LEAGUE_TYPES, LEAGUE_FORMATS, DRAFT_METHODS } from '@/utils/code/code';
import { commonFetch } from '@/utils/common/commonFetch';
import { useRouter } from 'vue-router';
import { encryptData } from '@/utils/common/crypto';

const router = useRouter();

const userStore = useUserStore();
const user = userStore.user;
const { mobile } = useDisplay();

const tomorrow = ref(dayjs().add(1, 'day').format('YYYY.MM.DD'));
const twoDaysLater = ref(dayjs().add(2, 'day').format('YYYY.MM.DD'));
const step = ref(1);
const leagueName = ref(user.nickname ? user.nickname + "의 리그" : "");
const leagueType = ref('');
const leagueFormat = ref('');
const draftMethod = ref('');
const isPublic = ref(true);
const maxTeams = ref(8);
const playoffTeams = ref(4);
const seasonStartDate = ref(dayjs(twoDaysLater.value, 'YYYY.MM.DD').toDate());
const draftDate = ref(dayjs(tomorrow.value, 'YYYY.MM.DD').toDate());
draftDate.value = draftMethod.value !== 'custom' ? draftDate.value : null;
const draftTime = ref('12:00');

const step1Ref = ref(null);
const step2Ref = ref(null);

const stepLabels = [
    '리그 이름',
    '리그 종류',
    '드래프트 방식',
    '세부 설정',
    '완료',
];

const handlePrev = () => {
    if (step.value > 1) {
        step.value--;
    }
}

const handleNext = async () => {
    if (step.value === 1 && !leagueName.value) {
        alert('리그 이름을 입력해 주세요.', 'error');
        return;
    }

    if (step.value === 2) {
        if (!leagueType.value) {
            alert('리그 유형을 선택해 주세요.', 'error');
            return;
        }
        if (!leagueFormat.value) {
            alert('리그 방식을 선택해 주세요.', 'error');
            return;
        }
    }

    if (step.value === 3 && !draftMethod.value) {
        alert('드래프트 방식을 선택해 주세요.', 'error');
        return;
    }

    if (step.value === 4) {
        if (!maxTeams.value || maxTeams.value < 4 || maxTeams.value > 30) {
            alert('최대 팀 수는 4에서 30 사이로 설정해 주세요.', 'error');
            return;
        }

        if (!playoffTeams.value || playoffTeams.value < 1 || playoffTeams.value >= maxTeams.value) {
            alert('플레이오프 팀 수는 최대 팀 수보다 적어야 합니다.', 'error');
            return;
        }

        if (draftMethod.value !== 'custom' && !draftDate.value) {
            alert('드래프트 일자를 설정해 주세요.', 'error');
            return;
        }

        if (draftMethod.value !== 'custom' && !draftTime.value) {
            alert('드래프트 시간을 설정해 주세요.', 'error');
            return;
        }

        if (!seasonStartDate.value) {
            alert('시즌 시작일을 설정해 주세요.', 'error');
            return;
        }

        if (draftMethod.value !== 'custom' && dayjs(draftDate.value).isAfter(dayjs(seasonStartDate.value), 'day')) {
            alert('시즌 시작일이 드래프트 일보다 빠를 수 없습니다.', 'error');
            return;
        }

        const confirmMessage = `📋 리그 정보를 확인해 주세요:

- 리그명: ${leagueName.value}
- 리그 유형: ${LEAGUE_TYPES.find((row) => row.id === leagueType.value)?.label}
- 리그 방식: ${LEAGUE_FORMATS.find((row) => row.id === leagueFormat.value)?.label}
- 드래프트 방식: ${DRAFT_METHODS.find((row) => row.id === draftMethod.value)?.label}
- 리그 공개 여부: ${isPublic.value ? '공개' : '비공개'}
- 최대 팀 수: ${maxTeams.value}팀
- 플레이오프 팀 수: ${playoffTeams.value}팀${draftMethod.value !== 'custom' ? '\n- 드래프트 일자: ' + dayjs(draftDate.value).format('YYYY.MM.DD') + ' ' + draftTime.value : ''}
- 시즌 시작일: ${dayjs(seasonStartDate.value).format('YYYY.MM.DD')}

이대로 진행할까요?`;

        if (!await confirm(confirmMessage)) return;

        const draftDateTimeISO = draftMethod.value !== 'custom' && draftDate.value && draftTime.value
        ? dayjs(draftDate.value)
            .hour(Number(draftTime.value.split(':')[0]))
            .minute(Number(draftTime.value.split(':')[1]))
            .second(0)
            .millisecond(0)
            .toISOString()
        : null

        const response = await commonFetch(`/api/league/create`, {
            method: 'POST',
            body: {
                leagueName: leagueName.value,
                leagueType: leagueType.value,
                leagueFormat: leagueFormat.value,
                draftMethod: draftMethod.value,
                isPublic: isPublic.value,
                maxTeams: maxTeams.value,
                playoffTeams: playoffTeams.value,
                seasonStartDate: seasonStartDate.value,
                draftDate: draftDateTimeISO
            }
        });

        if (response.success && response.data?.leagueId && response.data?.seasonId) {
            const leagueId = response.data.leagueId;
            const seasonId = response.data.seasonId;

            return router.replace({
                path: '/league/create/complete',
                query: {
                    leagueId: encryptData(leagueId),
                    seasonId: encryptData(seasonId)
                }
            });
        } else {
            console.error('리그 생성 실패:', response);
            return alert("리그 생성 도중 문제가 발생하였습니다.\n다시 시도해주세요.", "error");
        }
    }

    if (step.value < stepLabels.length) {
        step.value++;
    }

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};
</script>
