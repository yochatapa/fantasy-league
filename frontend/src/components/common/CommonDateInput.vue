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
    modelValue: [String, Date, null],
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

// ✅ 날짜 유효성 검사
const isValidDate = (dateStr) => {
    return dayjs(dateStr, 'YYYY.MM.DD', true).isValid() || dayjs(dateStr).isValid();
};

// ✅ min/max 범위 체크
const isWithinRange = (dateStr) => {
    if (!isValidDate(dateStr)) return false;

    const date = dayjs(dateStr);
    const minDate = props.min ? dayjs(props.min) : null;
    const maxDate = props.max ? dayjs(props.max) : null;

    if (minDate && date.isBefore(minDate)) return false;
    if (maxDate && date.isAfter(maxDate)) return false;

    return true;
};

// ✅ modelValue 감시
watch(() => props.modelValue, (newVal) => {
    if (!newVal) {
        innerValue.value = '';
        input.value = '';
        return;
    }

    if (!isWithinRange(newVal)) {
        innerValue.value = '';
        input.value = '';
        emit('update:modelValue', '');
    } else {
        innerValue.value = newVal;
        input.value = formatDate(newVal);
    }
});

// ✅ onMounted 초기값 처리
onMounted(() => {
    if (props.modelValue && isWithinRange(props.modelValue)) {
        innerValue.value = props.modelValue;
        input.value = formatDate(props.modelValue);
    }
});

// ✅ date-picker 변경 처리
const handleDatePickerChange = (newVal) => {
    if (newVal && isWithinRange(newVal)) {
        const formatted = formatDate(newVal);
        emit('update:modelValue', formatted);
        input.value = formatted;
        innerValue.value = formatted;
    } else {
        emit('update:modelValue', '');
        input.value = '';
        innerValue.value = '';
    }
    menu.value = false;
};

// ✅ blur 처리: 숫자 8자리(예: 20250708) 입력 후 자동 포맷
const handleBlur = () => {
    const digits = input.value.replace(/[^\d]/g, '');
    if (digits.length === 8) {
        const yyyy = digits.slice(0, 4);
        const mm = digits.slice(4, 6);
        const dd = digits.slice(6, 8);
        const formatted = `${yyyy}.${mm}.${dd}`;

        if (isValidDate(formatted) && isWithinRange(formatted)) {
            emit('update:modelValue', formatted);
            innerValue.value = formatted;
            input.value = formatted;
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

<style scoped>
:deep(.v-overlay__content) {
    min-width: auto !important;
}
</style>