<template>
    <v-container class="py-10" fluid>
      <v-stepper v-model="step" class="mx-auto">
        <v-stepper-header>
          <v-stepper-item
            v-for="(label, index) in stepLabels"
            :key="index"
            :value="index + 1"
            :style="mobile && index !== step - 1?'display:none':''"
          >
            {{ label }}
          </v-stepper-item>
        </v-stepper-header>
  
        <v-stepper-window>
          <v-stepper-window-item class="pa-1" :value="1">
            <LeagueCreateStep1 v-model="leagueName" ref="step1Ref"/>
          </v-stepper-window-item>
          <v-stepper-window-item class="pa-1" :value="2">
            <LeagueCreateStep2 v-model:leagueType="leagueType" v-model:leagueFormat="leagueFormat" ref="step2Ref"/>
          </v-stepper-window-item>
          <v-stepper-window-item class="pa-1" :value="3">
            <LeagueCreateStep3  v-model:draftMethod="draftMethod"/>
          </v-stepper-window-item>
          <v-stepper-window-item class="pa-1" :value="4">
            <LeagueCreateStep4 
                v-model:draftMethod="draftMethod"
                v-model:isPublic="isPublic"
                v-model:maxTeams="maxTeams"
                v-model:playoffTeams="playoffTeams"
                v-model:seasonStartDate="seasonStartDate"
                v-model:draftDate="draftDate"
            />
          </v-stepper-window-item>
          <v-stepper-window-item class="pa-1" :value="5">
          </v-stepper-window-item>
        </v-stepper-window>
  
        <v-stepper-actions 
            class="mt-6" 
            :style="step === stepLabels.length?'display:none':''"
            @click:prev="handlePrev"
            @click:next="handleNext"
        >
        </v-stepper-actions>
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
import { encryptData } from '@/utils/common/crypto'

const router = useRouter();

const userStore = useUserStore();
const user = userStore.user;
const { mobile } = useDisplay();

const step = ref(1); // Step 1부터 시작
const leagueName = ref(user.nickname?user.nickname+"의 리그":"");    // 리그명 상태 관리
const leagueType = ref('');                                         // 예: 'head-to-head', 'season'
const leagueFormat = ref('');                                       // 예: 'point', 'roto'
const draftMethod = ref('');                                        // 드래프트 방법
const isPublic = ref(true);                                         // 리그 공개 여부
const maxTeams = ref(8);                                            // 최대 팀 수
const playoffTeams = ref(4);                                        // 플레이오프 팀 수
const seasonStartDate = ref(new Date());                            // 시즌 시작일
const draftDate = ref(new Date());                                  // 드래프트 일자

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
    // 각 스텝에서 추가적인 validation 로직을 추가할 수 있음
    if (step.value === 1) {
        if (!leagueName.value){
            alert('리그 이름을 입력해 주세요.', 'error');
            return;
        }
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

    if(step.value === 3){
      if (!draftMethod.value) {
            alert('드래프트 방식을 선택해 주세요.', 'error');
            return;
        }
    }

    if(step.value === 4){
        if (!maxTeams.value || maxTeams.value < 4 || maxTeams.value > 30) {
            alert('최대 팀 수는 4에서 30 사이로 설정해 주세요.', 'error');
            return false;
        }

        if (!playoffTeams.value || playoffTeams.value < 1 || playoffTeams.value >= maxTeams.value) {
            alert('플레이오프 팀 수는 최대 팀 수보다 적어야 합니다.', 'error');
            return false;
        }

        if (!seasonStartDate.value) {
            alert('시즌 시작일을 설정해 주세요.', 'error');
            return false;
        }

        if (draftMethod.value !== 'custom' && !draftDate.value) {
            alert('드래프트 일자를 설정해 주세요.', 'error');
            return false;
        }
        
        // 여기 추가: 사용자에게 확인창 띄우기
        const confirmMessage = `📋 리그 정보를 확인해 주세요:

- 리그명: ${leagueName.value}
- 리그 유형: ${LEAGUE_TYPES.filter((row)=>row.id === leagueType.value)[0].label}
- 리그 방식: ${LEAGUE_FORMATS.filter((row)=>row.id === leagueFormat.value)[0].label}
- 드래프트 방식: ${DRAFT_METHODS.filter((row)=>row.id === draftMethod.value)[0].label}
- 리그 공개 여부: ${isPublic.value ? '공개' : '비공개'}
- 최대 팀 수: ${maxTeams.value}팀
- 플레이오프 팀 수: ${playoffTeams.value}팀
- 시즌 시작일: ${dayjs(seasonStartDate.value).format('YYYY.MM.DD')}
${draftMethod.value !== 'custom' ? '- 드래프트 일자: ' + dayjs(draftDate.value).format('YYYY.MM.DD') : ''}
        
이대로 진행할까요?`;

        if (!await confirm(confirmMessage)) return;
        
        //api 호출하여 저장
        const response = await commonFetch(`/api/league/create`,
            {
                method: 'POST',
                body: {
                    leagueName        : leagueName.value
                    , leagueType        : leagueType.value
                    , leagueFormat      : leagueFormat.value
                    , draftMethod       : draftMethod.value
                    , isPublic          : isPublic.value
                    , maxTeams          : maxTeams.value
                    , playoffTeams      : playoffTeams.value
                    , seasonStartDate   : seasonStartDate.value
                    , draftDate         : draftDate.value
                }
            }
        );

        if (response.success) {
            if(response.data && response.data?.leagueId && response.data?.seasonId){
                const leagueId = response.data?.leagueId
                const seasonId = response.data?.seasonId;

                console.log('리그 생성 성공:', response);

                return router.replace({
                    path: '/league/create/complete',
                    query: {
                        leagueId : encryptData(leagueId),
                        seasonId : encryptData(seasonId)
                    }
                });
            }else return alert("리그 생성 도중 문제가 발생하였습니다.\n다시 시도해주세요.", "error");
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
        behavior: 'smooth', // 부드럽게 스크롤
    });
};
</script>
  