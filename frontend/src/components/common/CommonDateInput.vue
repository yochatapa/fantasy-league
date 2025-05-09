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
import { formatDate } from '@/utils/common/dateUtils.js';

const props = defineProps({
    modelValue: String,
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
const innerValue = ref(props.modelValue || '');

// ✅ 날짜 형식 체크 함수
const isValidDate = (dateStr) => {
    return !isNaN(Date.parse(dateStr));
};

// ✅ min/max 범위 체크 함수
const isWithinRange = (dateStr) => {
    if (!isValidDate(dateStr)) return false;

    const date = new Date(dateStr);
    const minDate = props.min ? new Date(props.min) : null;
    const maxDate = props.max ? new Date(props.max) : null;

    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;

    return true;
};

// ✅ 부모로부터 값이 변경될 때 동기화
watch(() => props.modelValue, (newVal) => {
    innerValue.value = newVal || '';
    input.value = formatDate(newVal);

    if (newVal && !isWithinRange(newVal)) {
        innerValue.value = '';
        input.value = '';
        emit('update:modelValue', '');
    }
});

// ✅ 🚀 onMounted에서 초기값 동기화
onMounted(() => {
    if (props.modelValue) {
        innerValue.value = props.modelValue;
        input.value = formatDate(props.modelValue);
    }
});

// ✅ DatePicker 값이 변경될 때 처리
const handleDatePickerChange = (newVal) => {
    if (newVal && isWithinRange(newVal)) {
        emit('update:modelValue', newVal);
        input.value = formatDate(newVal);
    } else {
        innerValue.value = '';
        input.value = '';
        emit('update:modelValue', '');
    }
    menu.value = false;
};

// ✅ blur 시 유효성 검사 및 날짜 변환
const handleBlur = () => {
    const digits = input.value.replace(/[^\d]/g, '');
    if (digits.length === 8) {
        const yyyy = digits.slice(0, 4);
        const mm = digits.slice(4, 6);
        const dd = digits.slice(6, 8);
        const formatted = `${yyyy}-${mm}-${dd}`;

        if (isValidDate(formatted) && isWithinRange(formatted)) {
            emit('update:modelValue', formatted);
            innerValue.value = formatted;
            input.value = formatDate(formatted);
        } else {
            emit('update:modelValue', '');
            innerValue.value = '';
            input.value = '';
        }
    } else {
        emit('update:modelValue', '');
        innerValue.value = '';
        input.value = '';
    }
};
</script>
