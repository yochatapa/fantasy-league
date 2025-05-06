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
            @update:model-value="menu = false"
            :min="min"
            :max="max"
        />
    </v-menu>
</template>

<script setup>
import { ref, watch } from 'vue';
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

// 내부 날짜 값과 modelValue 연결
const innerValue = ref(props.modelValue || '');

watch(() => props.modelValue, (newVal) => {
    innerValue.value = newVal || '';
    input.value = formatDate(newVal);
});

watch(innerValue, (newVal) => {
    emit('update:modelValue', newVal);
    input.value = formatDate(newVal);
});

// 숫자만 있는 8자리 입력 시 날짜 형식으로 변환
const handleBlur = () => {
    const digits = input.value.replace(/[^\d]/g, '');
    if (digits.length === 8) {
        const yyyy = digits.slice(0, 4);
        const mm = digits.slice(4, 6);
        const dd = digits.slice(6, 8);
        const formatted = `${yyyy}-${mm}-${dd}`;
        emit('update:modelValue', formatted);
        input.value = formatDate(formatted);
    } else {
        emit('update:modelValue', '');
        input.value = '';
    }
};
</script>
