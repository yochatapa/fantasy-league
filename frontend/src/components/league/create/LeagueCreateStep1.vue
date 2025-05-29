<template>
    <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
        <v-text-field
            v-model="leagueName"
            label="리그 이름"
            :rules="[v => !!v || '리그 이름을 입력해 주세요']"
            required
            autofocus
        />
    </v-form>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    modelValue: String,
});
const emit = defineEmits(['update:modelValue']);

const leagueName = ref(props.modelValue);
const valid = ref(false);
const form = ref(null);

watch(leagueName, (val) => emit('update:modelValue', val));

// 부모에서 접근할 수 있도록 expose
defineExpose({
    validate: () => form.value?.validate(),
});
</script>
