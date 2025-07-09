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
                :min="formatDate(tomorrow)"
                :max="formatDate(endOfYear)"
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
                :min="formatDate(dayjs(draftDate).add(1, 'day'))"
                :max="formatDate(endOfYear)"
            />
        </v-col>
    </v-row>
    

    <!-- <v-menu
        v-model="seasonStartMenu"
        :close-on-content-click="false"
        transition="scale-transition"
        offset-y
        min-width="290px"
    >
        <template #activator="{ props: menuProps }">
            <v-text-field
                v-model="seasonStartDateFormatted"
                label="시즌 시작일"
                readonly
                v-bind="menuProps"
                :rules="[v => !!v || '시즌 시작일을 설정해 주세요.']"
                required
            />
        </template>
        <v-date-picker
            v-model="seasonStartDate"
            :min="today"
            :max="endOfYear"
            @update:model-value="onSeasonStartDateSelect"
        />
    </v-menu> -->

    <!-- <v-menu
        v-model="draftDateMenu"
        :close-on-content-click="false"
        transition="scale-transition"
        offset-y
        min-width="290px"
    >
        <template #activator="{ props: menuProps }">
            <v-text-field
                v-model="draftDateFormatted"
                label="드래프트 일자"
                readonly
                v-bind="menuProps"
                :disabled="isDraftDateDisabled"
                :rules="isDraftDateDisabled ? [] : [v => !!v || '드래프트 일자를 설정해 주세요.']"
                :required="!isDraftDateDisabled"
            />
        </template>
        <v-date-picker
            v-model="draftDate"
            :min="today"
            :max="endOfYear"
            @update:model-value="onDraftDateSelect"
        />
    </v-menu> -->

    <v-form ref="form"></v-form>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import { formatDate } from '@/utils/common/dateUtils.js';
import CommonDateInput from '@/components/common/CommonDateInput.vue';
import CommonTimeInput from '@/components/common/CommonTimeInput.vue';

// props & emits
const props = defineProps({
    draftMethod: String,
    isPublic: Boolean,
    maxTeams: Number,
    playoffTeams: Number,
    seasonStartDate: [String, Date, null],
    draftDate: [String, Date, null],
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

// local states
const tomorrow = ref(formatDate(dayjs().add(1, 'day')));
const twoDaysLater = ref(formatDate(dayjs().add(2, 'day')));
const draftMethod = computed(() => props.draftMethod);
const isPublic = ref(props.isPublic);
const maxTeams = ref(props.maxTeams);
const playoffTeams = ref(props.playoffTeams);
const seasonStartDate = ref(props.seasonStartDate ? dayjs(props.seasonStartDate).toDate() : dayjs().add(2, 'day').toDate());
const draftDate = ref(draftMethod.value !== 'custom'
    ? (props.draftDate ? dayjs(props.draftDate).toDate() : dayjs().add(1, 'day').toDate())
    : dayjs().add(1, 'day').toDate()
);
const draftTime = ref(draftMethod.value !== 'custom' ? props.draftTime : '12:00');
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);

// utils
const isSameDate = (a, b) => dayjs(a).isSame(b, 'day');

// emit on change (but only if value actually changed)
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

    // draftDate 기준으로 seasonStartDate 자동 설정
    if (props.draftMethod !== 'custom') {
        const nextDay = dayjs(val).add(1, 'day').toDate();
        if (!isSameDate(nextDay, seasonStartDate.value)) {
            seasonStartDate.value = val ? nextDay : null;
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
        ? (props.draftDate ? dayjs(props.draftDate).toDate() : dayjs().add(1, 'day').toDate())
        : dayjs().add(1, 'day').toDate();
    draftTime.value = val !== 'custom' ? props.draftTime : '12:00';
});

// sync props → local state (단, 값이 다를 때만)
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
    const newVal = val ? dayjs(val).toDate() : null;
    if (!isSameDate(seasonStartDate.value, newVal)) {
        seasonStartDate.value = newVal;
    }
});
watch(() => props.draftDate, (val) => {
    const newVal = val ? dayjs(val).toDate() : null;
    if (!isSameDate(draftDate.value, newVal)) {
        draftDate.value = newVal;
    }
});

// computed
const isDraftDateDisabled = computed(() => props.draftMethod === 'custom');

const today = computed(() => dayjs().startOf('day').toDate());
const endOfYear = computed(() => dayjs().endOf('year').toDate());

// options
const maxTeamsOptions = Array.from({ length: 27 }, (_, i) => i + 4);
const playoffTeamsOptions = computed(() => {
    const max = maxTeams.value ? maxTeams.value - 1 : 3;
    const start = 2;
    const count = Math.max(0, max - start + 1);
    return Array.from({ length: count }, (_, i) => i + start);
});

// form validation
import { ref as vueRef } from 'vue';
const form = vueRef(null);
const validateStep = async () => {
    if (!form.value) return true;
    const { valid } = await form.value.validate();
    return valid;
};

defineExpose({ validateStep });
</script>
