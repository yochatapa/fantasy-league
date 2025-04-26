<template>
    <div>
        <h2 class="text-h5 font-weight-bold mb-4">리그 유형 선택</h2>
        <v-row dense>
            <v-col
                v-for="(type, index) in leagueTypes"
                :key="index"
                cols="12" sm="6"
            >
                <v-card
                    :elevation="selectedType === type.id ? 8 : 2"
                    :class="selectedType === type.id ? 'bg-primary text-white' : ''"
                    class="pa-4"
                    @click="selectType(type.id)"
                >
                    <div class="text-h6">{{ type.label }}</div>
                    <div class="text-body-2 mt-2">{{ type.description }}</div>
                </v-card>
            </v-col>
        </v-row>

        <v-divider class="my-6" />

        <template v-if="selectedType">
            <h2 class="text-h6 font-weight-bold mb-4">방식 선택</h2>
            <v-row dense>
                <v-col
                    v-for="(format, index) in filteredFormats"
                    :key="index"
                    cols="12" sm="6" md="4"
                >
                    <v-card
                        :elevation="selectedFormat === format.id ? 8 : 2"
                        :class="selectedFormat === format.id ? 'bg-secondary text-white' : ''"
                        class="pa-4 card-fixed"
                        @click="selectFormat(format.id)"
                    >
                        <div class="text-subtitle-1 font-weight-medium mb-1">{{ format.label }}</div>
                        <div class="text-body-2">{{ format.description }}</div>
                    </v-card>
                </v-col>
            </v-row>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Props로 받기
const props = defineProps({
    leagueType: {
        type: String,
        required: true,
    },
    leagueFormat: {
        type: String,
        required: true,
    },
});

// 부모 컴포넌트에 전달할 emit 설정
const emit = defineEmits(['update:leagueType', 'update:leagueFormat']);

// 내부 선택 상태
const selectedType = ref(props.leagueType);
const selectedFormat = ref(props.leagueFormat);

// props가 바뀌면 내부도 동기화
watch(() => props.leagueType, (val) => selectedType.value = val);
watch(() => props.leagueFormat, (val) => selectedFormat.value = val);

// 선택 핸들러
const selectType = (typeId) => {
    selectedType.value = typeId;
    selectedFormat.value = ''; // 포맷 초기화
    emit('update:leagueType', typeId);
    emit('update:leagueFormat', ''); // format 초기화도 알림
};

const selectFormat = (formatId) => {
    selectedFormat.value = formatId;
    emit('update:leagueFormat', formatId);
};

// 리그 유형
const leagueTypes = [
    {
        id: 'head2head',
        label: '헤드 투 헤드',
        description: '매주 매치업을 통해 승패를 겨루는 방식',
    },
    {
        id: 'season',
        label: '시즌 누적',
        description: '시즌 전체 스탯을 누적하여 승부',
    },
];

// 리그 방식
const leagueFormats = [
    {
        id: 'h2h-category',
        type: 'head2head',
        label: '일반',
        description: '주간 스탯 승수를 비교하여 승리',
    },
    {
        id: 'h2h-points',
        type: 'head2head',
        label: '포인트제',
        description: '스탯마다 포인트를 설정해 총합으로 승부',
    },
    {
        id: 'h2h-roto',
        type: 'head2head',
        label: '로티서리',
        description: '주간 순위를 기준으로 점수를 부여',
    },
    {
        id: 'season-points',
        type: 'season',
        label: '포인트제',
        description: '시즌 전체 포인트 누적으로 경쟁',
    },
    {
        id: 'season-roto',
        type: 'season',
        label: '로티서리',
        description: '시즌 전체 스탯 순위로 점수를 부여',
    },
];

// 선택된 유형에 따라 포맷 필터링
const filteredFormats = computed(() =>
    leagueFormats.filter((format) => format.type === selectedType.value)
);
</script>

<style scoped>
.v-card {
    cursor: pointer;
    transition: all 0.2s;
    margin: 2px;
}

.card-fixed {
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
</style>
