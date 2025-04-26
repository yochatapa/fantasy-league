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
                v-model:isPrivate="isPrivate"
                v-model:maxTeams="maxTeams"
                v-model:playoffTeams="playoffTeams"
                v-model:seasonStartDate="seasonStartDate"
                v-model:draftDate="draftDate"
            />
          </v-stepper-window-item>
          <v-stepper-window-item class="pa-1" :value="5">
            <LeagueCreateStep5 />
          </v-stepper-window-item>
        </v-stepper-window>
  
        <v-stepper-actions 
            class="mt-6" 
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
import LeagueCreateStep1 from '@/components/league/create/LeagueCreateStep1.vue';
import LeagueCreateStep2 from '@/components/league/create/LeagueCreateStep2.vue';
import LeagueCreateStep3 from '@/components/league/create/LeagueCreateStep3.vue';
import LeagueCreateStep4 from '@/components/league/create/LeagueCreateStep4.vue';
import LeagueCreateStep5 from '@/components/league/create/LeagueCreateStep5.vue';

const userStore = useUserStore();
const user = userStore.user;
const { mobile } = useDisplay();

const step = ref(1); // Step 1부터 시작
const leagueName = ref(user.nickname?user.nickname+"의 리그":"");    // 리그명 상태 관리
const leagueType = ref('');                                         // 예: 'head-to-head', 'season'
const leagueFormat = ref('');                                       // 예: 'point', 'roto'
const draftMethod = ref('');                                        // 드래프트 방법
const isPrivate = ref(true);                                        // 리그 공개 여부
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
        console.log(maxTeams.value)
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
  