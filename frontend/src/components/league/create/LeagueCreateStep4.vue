<template>
    <v-switch v-model="isPublic" color="primary" :label="isPublic?'공개 리그':'비공개 리그'" />

    <v-row>
        <v-col cols="12">
            <v-select
                v-model="maxTeams"
                :items="maxTeamsOptions"
                label="최대 팀 수"
                :rules="[v => !!v || '최대 팀 수를 선택해 주세요.']"
                required
            />
        </v-col>

        <v-col cols="12">
            <v-select
                v-model="playoffTeams"
                :items="playoffTeamsOptions"
                label="플레이오프 팀 수"
                :rules="[v => !!v || '플레이오프 팀 수를 선택해 주세요.']"
                required
            />
        </v-col>

        <v-col cols="12" md="6" v-if="draftMethod !== 'custom'">
            <CommonDateInput
                v-model="draftDate"
                :label="`드래프트 일자 (${timezone})`"
                :rules="[v => !!v || '경기일자를 입력해주세요.']"
                :required="!isDraftDateDisabled"
                :min="draftDateMin"
                :max="endOfYear.format('YYYY-MM-DD')"
            />
        </v-col>
        <v-col cols="12" md="6" v-if="draftMethod !== 'custom'">
            <CommonTimeInput
                v-model="draftTime"
                :label="`드래프트 시간 (${timezone})`"
                :is12Hour="true"
                :required="true"
            />
        </v-col>
        <v-col cols="12">
            <CommonDateInput
                v-model="seasonStartDate"
                label="시즌 시작일 (Asia/Seoul)"
                :rules="[v => !!v || '시즌 시작일을 설정해 주세요.']"
                required
                :min="seasonStartDateMin"
                :max="endOfYear.format('YYYY-MM-DD')"
            />
        </v-col>
    </v-row>

    <v-form ref="form"></v-form>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import { formatDate } from '@/utils/common/dateUtils.js';
import CommonDateInput from '@/components/common/CommonDateInput.vue';
import CommonTimeInput from '@/components/common/CommonTimeInput.vue';

const props = defineProps({
    draftMethod: String,
    isPublic: Boolean,
    maxTeams: Number,
    playoffTeams: Number,
    seasonStartDate: [String, Object, null],
    draftDate: [String, Object, null],
    draftTime: [String, null]
});

const emit = defineEmits([
    'update:isPublic',
    'update:maxTeams',
    'update:playoffTeams',
    'update:seasonStartDate',
    'update:draftDate',
    'update:draftTime',
]);

const draftMethod = computed(() => props.draftMethod);
const isPublic = ref(props.isPublic);
const maxTeams = ref(props.maxTeams);
const playoffTeams = ref(props.playoffTeams);
const seasonStartDate = ref(props.seasonStartDate ? dayjs(props.seasonStartDate) : dayjs().add(2, 'day'));
const draftDate = ref(draftMethod.value !== 'custom'
    ? (props.draftDate ? dayjs(props.draftDate) : dayjs().add(1, 'day'))
    : dayjs().add(1, 'day')
);
const draftTime = ref(draftMethod.value !== 'custom' ? props.draftTime : '12:00');
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);

const isSameDate = (a, b) => dayjs(a).isSame(b, 'day');

watch(isPublic, (val) => emit('update:isPublic', val));
watch(maxTeams, (val) => emit('update:maxTeams', Number(val)));
watch(playoffTeams, (val) => emit('update:playoffTeams', Number(val)));

watch(seasonStartDate, (val) => {
    if (!isSameDate(val, props.seasonStartDate)) {
        emit('update:seasonStartDate', val);
    }
});

watch(draftDate, (val) => {
    if (!isSameDate(val, props.draftDate)) {
        emit('update:draftDate', val);
    }

    // 드래프트 날짜 기준 시즌 시작일 2일 뒤로 자동 세팅
    if (props.draftMethod !== 'custom') {
        const twoDaysLater = dayjs(val).add(2, 'day');
        if (!isSameDate(twoDaysLater, seasonStartDate.value)) {
            seasonStartDate.value = val ? twoDaysLater : null;
        }
    }
});

watch(draftTime, (val) => {
    if (val !== props.draftTime) {
        emit('update:draftTime', val);
    }
});

watch(() => draftMethod.value, (val) => {
    draftDate.value = val !== 'custom'
        ? (props.draftDate ? dayjs(props.draftDate) : dayjs().add(1, 'day'))
        : dayjs().add(1, 'day');
    draftTime.value = val !== 'custom' ? props.draftTime : '12:00';
});

watch(() => props.isPublic, (val) => {
    if (isPublic.value !== val) isPublic.value = val;
});
watch(() => props.maxTeams, (val) => {
    if (maxTeams.value !== val) maxTeams.value = val;
});
watch(() => props.playoffTeams, (val) => {
    if (playoffTeams.value !== val) playoffTeams.value = val;
});
watch(() => props.seasonStartDate, (val) => {
    const newVal = val ? dayjs(val) : null;
    if (!isSameDate(seasonStartDate.value, newVal)) {
        seasonStartDate.value = newVal;
    }
});
watch(() => props.draftDate, (val) => {
    const newVal = val ? dayjs(val) : null;
    if (!isSameDate(draftDate.value, newVal)) {
        draftDate.value = newVal;
    }
});

const isDraftDateDisabled = computed(() => props.draftMethod === 'custom');

const today = computed(() => dayjs().startOf('day'));
const endOfYear = computed(() => dayjs().endOf('year'));
const draftDateMin = computed(() => dayjs().add(1, 'day').format('YYYY-MM-DD'));
// 여기서 2일 뒤로 변경
const seasonStartDateMin = computed(() => draftDate.value.add(2, 'day').format('YYYY-MM-DD'));

const maxTeamsOptions = Array.from({ length: 27 }, (_, i) => i + 4);
const playoffTeamsOptions = computed(() => {
    const max = maxTeams.value ? maxTeams.value - 1 : 3;
    const start = 2;
    const count = Math.max(0, max - start + 1);
    return Array.from({ length: count }, (_, i) => i + start);
});

import { ref as vueRef } from 'vue';
const form = vueRef(null);
const validateStep = async () => {
    if (!form.value) return true;
    const { valid } = await form.value.validate();
    return valid;
};

defineExpose({ validateStep });
</script>
