<template>
    <v-switch v-model="isPublic" color="primary" :label="isPublic?'공개 리그':'비공개 리그'" />

    <v-select
        v-model="maxTeams"
        :items="maxTeamsOptions"
        label="최대 팀 수"
        :rules="[v => !!v || '최대 팀 수를 선택해 주세요.']"
        required
    />

    <v-select
        v-model="playoffTeams"
        :items="playoffTeamsOptions"
        label="플레이오프 팀 수"
        :rules="[v => !!v || '플레이오프 팀 수를 선택해 주세요.']"
        required
    />

    <CommonDateInput
        v-model="seasonStartDate"
        label="시즌 시작일"
        :rules="[v => !!v || '시즌 시작일을 설정해 주세요.']"
        required
        :min="formatDate(today)"
        :max="formatDate(endOfYear)"
    />
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

    <CommonDateInput
        v-model="draftDate"
        label="드래프트 일자"
        :rules="[v => !!v || '경기일자를 입력해주세요.']"
        :required="!isDraftDateDisabled"
        :min="formatDate(seasonStartDate)"
        :max="formatDate(endOfYear)"
    />

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
import { formatDate } from '@/utils/common/dateUtils.js';
import CommonDateInput from '@/components/common/CommonDateInput.vue';

// props & emits
const props = defineProps({
    draftMethod: String,
    isPublic: Boolean,
    maxTeams: Number,
    playoffTeams: Number,
    seasonStartDate: [String, Date, null],
    draftDate: [String, Date, null],
});

const emit = defineEmits([
    'update:isPublic',
    'update:maxTeams',
    'update:playoffTeams',
    'update:seasonStartDate',
    'update:draftDate',
]);

// local states
const isPublic = ref(props.isPublic);
const maxTeams = ref(props.maxTeams);
const playoffTeams = ref(props.playoffTeams);
const seasonStartDate = ref(props.seasonStartDate ? new Date(props.seasonStartDate) : null);
const draftDate = ref(props.draftDate ? new Date(props.draftDate) : null);

// utils
const isSameDate = (a, b) => {
    return a?.getTime?.() === b?.getTime?.();
};

// emit on change (but only if value actually changed)
watch(isPublic, (val) => emit('update:isPublic', val));
watch(maxTeams, (val) => emit('update:maxTeams', Number(val)));
watch(playoffTeams, (val) => emit('update:playoffTeams', Number(val)));

watch(seasonStartDate, (val) => {
    if (!isSameDate(val, new Date(props.seasonStartDate))) {
        emit('update:seasonStartDate', val);
    }
    // 자동으로 draftDate 설정
    if (props.draftMethod !== 'custom') {
        if (!isSameDate(val, draftDate.value)) {
            draftDate.value = val ? new Date(val) : null;
        }
    }
});

watch(draftDate, (val) => {
    if (!isSameDate(val, new Date(props.draftDate))) {
        emit('update:draftDate', val);
    }
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
    const newVal = val ? new Date(val) : null;
    if (!isSameDate(seasonStartDate.value, newVal)) {
        seasonStartDate.value = newVal;
    }
});
watch(() => props.draftDate, (val) => {
    const newVal = val ? new Date(val) : null;
    if (!isSameDate(draftDate.value, newVal)) {
        draftDate.value = newVal;
    }
});

// computed
const isDraftDateDisabled = computed(() => props.draftMethod === 'custom');

const today = computed(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
});
const endOfYear = computed(() => {
    const date = new Date();
    return new Date(date.getFullYear(), 11, 31);
});

const seasonStartDateFormatted = computed(() => formatDate(seasonStartDate.value));
const draftDateFormatted = computed(() => formatDate(draftDate.value));

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
