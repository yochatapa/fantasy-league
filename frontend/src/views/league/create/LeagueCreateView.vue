<template>
    <v-container class="py-10" fluid>
      <v-stepper v-model="step" class="mx-auto">
        <v-stepper-header>
          <v-stepper-item
            v-for="(label, index) in stepLabels"
            :key="index"
            :value="index + 1"
          >
            {{ label }}
          </v-stepper-item>
        </v-stepper-header>
  
        <v-stepper-window>
          <v-stepper-window-item :value="1">
            <LeagueCreateStep1 v-model="leagueName" ref="step1Ref"/>
          </v-stepper-window-item>
          <v-stepper-window-item :value="2">
            <LeagueCreateStep2 v-model:leagueType="leagueType" v-model:leagueFormat="leagueFormat" ref="step2Ref"/>
          </v-stepper-window-item>
          <v-stepper-window-item :value="3">
            <LeagueCreateStep3  v-model:draftMethod="draftMethod"/>
          </v-stepper-window-item>
          <v-stepper-window-item :value="4">
            <LeagueCreateStep4 />
          </v-stepper-window-item>
          <v-stepper-window-item :value="5">
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
import LeagueCreateStep1 from '@/components/league/create/LeagueCreateStep1.vue';
import LeagueCreateStep2 from '@/components/league/create/LeagueCreateStep2.vue';
import LeagueCreateStep3 from '@/components/league/create/LeagueCreateStep3.vue';
import LeagueCreateStep4 from '@/components/league/create/LeagueCreateStep4.vue';
import LeagueCreateStep5 from '@/components/league/create/LeagueCreateStep5.vue';

const userStore = useUserStore();
const user = userStore.user;

const step = ref(1); // Step 1부터 시작
const leagueName = ref(user.nickname?user.nickname+"의 리그":""); // 리그명 상태 관리
const leagueType = ref('');   // 예: 'head-to-head', 'season'
const leagueFormat = ref(''); // 예: 'point', 'roto'
const draftMethod = ref('');

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
            alert('리그 방식을 선택해 주세요.', 'error');
            return;
        }

        if (!leagueFormat.value) {
            alert('리그 포맷을 선택해 주세요.', 'error');
            return;
        }
    }

    if(step.value === 3){
      if (!draftMethod.value) {
            alert('드래프트 방식을 선택해 주세요.', 'error');
            return;
        }
    }
    
    if (step.value < stepLabels.length) {
        step.value++;
    }
};
</script>
  