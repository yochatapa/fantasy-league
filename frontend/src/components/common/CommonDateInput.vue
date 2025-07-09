<template>
    <v-menu
        v-model="menu"
        :close-on-content-click="false"
        transition="scale-transition"
        offset-y
        min-width="auto"
    >
        <template #activator="{ props }">
            <v-text-field
                v-model="input"
                v-bind="props"
                :label="label"
                :rules="rules"
                :disabled="disabled"
                :required="required"
                @blur="handleBlur"
            />
        </template>
        <v-date-picker
            v-model="innerValue"
            @update:model-value="handleDatePickerChange"
            :min="min"
            :max="max"
        />
    </v-menu>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import dayjs from 'dayjs';
import { formatDate } from '@/utils/common/dateUtils.js';

const props = defineProps({
    modelValue: [String, Object, null], // Object는 dayjs 객체 대응
    label: String,
    min: String,
    max: String,
    rules: Array,
    disabled: Boolean,
    required: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const input = ref('');
const menu = ref(false);
const innerValue = ref('');

// modelValue를 dayjs 객체로 변환하는 함수
const toDayjs = (val) => {
    if (!val) return null;
    if (dayjs.isDayjs(val)) return val;
    if (val instanceof Date) return dayjs(val);
    if (typeof val === 'string') return dayjs(val);
    return null;
};

// 날짜 유효성 검사
const isValidDate = (dateVal) => {
    const d = toDayjs(dateVal);
    return d && d.isValid();
};

// min/max 범위 체크
const isWithinRange = (dateVal) => {
    if (!isValidDate(dateVal)) return false;

    const date = toDayjs(dateVal);
    const minDate = props.min ? dayjs(props.min) : null;
    const maxDate = props.max ? dayjs(props.max) : null;

    if (minDate && date.isBefore(minDate, 'day')) return false;
    if (maxDate && date.isAfter(maxDate, 'day')) return false;

    return true;
};

const updateInputAndInnerValue = (val) => {
    if (!val) {
        innerValue.value = '';
        input.value = '';
        return;
    }
    const d = toDayjs(val);
    if (!d || !d.isValid() || !isWithinRange(d)) {
        innerValue.value = '';
        input.value = '';
        emit('update:modelValue', null);
        return;
    }
    innerValue.value = d.format('YYYY-MM-DD');
    input.value = formatDate(d);
};

// modelValue 감시
watch(() => props.modelValue, (newVal) => {
    updateInputAndInnerValue(newVal);
});

// onMounted 초기값 처리
onMounted(() => {
    updateInputAndInnerValue(props.modelValue);
});

// date-picker 변경 처리
const handleDatePickerChange = (newVal) => {
    if (newVal && isWithinRange(newVal)) {
        const d = toDayjs(newVal);
        emit('update:modelValue', d); // dayjs 객체로 emit
        input.value = formatDate(d);
        innerValue.value = d.format('YYYY-MM-DD');
    } else {
        emit('update:modelValue', null);
        input.value = '';
        innerValue.value = '';
    }
    menu.value = false;
};

// blur 처리: 숫자 8자리 입력 후 자동 포맷
const handleBlur = () => {
    const digits = input.value.replace(/[^\d]/g, '');
    if (digits.length === 8) {
        const yyyy = digits.slice(0, 4);
        const mm = digits.slice(4, 6);
        const dd = digits.slice(6, 8);
        const formatted = `${yyyy}.${mm}.${dd}`;

        if (isValidDate(formatted) && isWithinRange(formatted)) {
            const d = toDayjs(formatted);
            emit('update:modelValue', d);
            innerValue.value = d.format('YYYY-MM-DD');
            input.value = formatted;
        } else {
            emit('update:modelValue', null);
            innerValue.value = '';
            input.value = '';
        }
    } else {
        emit('update:modelValue', null);
        innerValue.value = '';
        input.value = '';
    }
};
</script>
