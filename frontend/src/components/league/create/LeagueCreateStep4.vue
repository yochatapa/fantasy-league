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

    <v-menu
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
    </v-menu>

    <v-menu
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
    </v-menu>

    <v-form ref="form"></v-form>
</template>

<script setup>
import { ref, computed, watch, defineProps, defineEmits } from 'vue';
import { formatDate } from '@/utils/common/dateUtils.js';

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

const isPublic = ref(props.isPublic);
const maxTeams = ref(props.maxTeams);
const playoffTeams = ref(props.playoffTeams);
const seasonStartDate = ref(props.seasonStartDate ? new Date(props.seasonStartDate) : null);
const draftDate = ref(props.draftDate ? new Date(props.draftDate) : null);

// emit when local state changes
watch(isPublic, (newValue) => emit('update:isPublic', newValue));
watch(maxTeams, (newValue) => emit('update:maxTeams', Number(newValue)));
watch(playoffTeams, (newValue) => emit('update:playoffTeams', Number(newValue)));
watch(seasonStartDate, (newValue) => {
    emit('update:seasonStartDate', newValue);
    if (props.draftMethod !== 'custom' && newValue) {
        draftDate.value = new Date(newValue);
    } else if (props.draftMethod !== 'custom' && !newValue) {
        draftDate.value = null;
    }
});
watch(draftDate, (newValue) => emit('update:draftDate', newValue));

// react to prop changes
watch(() => props.isPublic, (newValue) => { isPublic.value = newValue; });
watch(() => props.maxTeams, (newValue) => { maxTeams.value = newValue; });
watch(() => props.playoffTeams, (newValue) => { playoffTeams.value = newValue; });
watch(() => props.seasonStartDate, (newValue) => { seasonStartDate.value = newValue ? new Date(newValue) : null; });
watch(() => props.draftDate, (newValue) => { draftDate.value = newValue ? new Date(newValue) : null; });

// menu open 상태
const seasonStartMenu = ref(false);
const draftDateMenu = ref(false);

// 드래프트 일자 활성화 여부
const isDraftDateDisabled = computed(() => props.draftMethod === 'custom');

// 오늘 ~ 올해 마지막 날짜
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

const onSeasonStartDateSelect = () => {
    seasonStartMenu.value = false;
};
const onDraftDateSelect = () => {
    draftDateMenu.value = false;
};

// 최대 팀 수 옵션 4~30
const maxTeamsOptions = Array.from({ length: 27 }, (_, i) => i + 4);

// 플레이오프 팀 수 옵션 (최대 팀 수보다 작은 수들)
const playoffTeamsOptions = computed(() => {
    const max = maxTeams.value ? maxTeams.value - 1 : 3;
    const start = 2;
    const count = Math.max(0, max - start + 1); // 2부터 max까지 몇 개 필요한지 계산
    return Array.from({ length: count }, (_, i) => i + start);
});


// v-form 유효성 검사용
import { ref as vueRef } from 'vue';
const form = vueRef(null);

const validateStep = async () => {
    if (!form.value) return true;
    const { valid } = await form.value.validate();
    return valid;
};

defineExpose({ validateStep });
</script>
