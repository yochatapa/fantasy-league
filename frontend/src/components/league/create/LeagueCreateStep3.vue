<template>
    <div>
        <h2 class="text-h5 font-weight-bold mb-4">드래프트 방식 선택</h2>
        <v-row dense>
            <v-col
                v-for="(method, index) in draftMethods"
                :key="index"
                cols="12" sm="6" md="4"
            >
                <v-card
                    :elevation="selectedMethod === method.id ? 8 : 2"
                    :class="selectedMethod === method.id ? 'bg-primary text-white' : ''"
                    class="pa-4 card-fixed"
                    @click="selectMethod(method.id)"
                >
                    <div class="card-title">{{ method.label }}</div>
                    <div class="card-description">{{ method.description }}</div>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { DRAFT_METHODS } from '@/utils/code/code';

// props로 현재 드래프트 방식 받기
const props = defineProps({
    draftMethod: {
        type: String,
        required: true,
    },
});

// 부모에게 선택한 드래프트 방식 전달
const emit = defineEmits(['update:draftMethod']);

const selectedMethod = ref(props.draftMethod);

watch(() => props.draftMethod, (val) => selectedMethod.value = val);

// 선택 함수
const selectMethod = (methodId) => {
    selectedMethod.value = methodId;
    emit('update:draftMethod', methodId);
};

// 드래프트 방식 리스트
const draftMethods = DRAFT_METHODS;
</script>

<style scoped>
.card-fixed {
    min-height: 140px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    margin: 2px;
}

.card-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 8px;
}

.card-description {
    font-size: 0.9rem;
    color: inherit;
}
</style>
