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
                    :class="selectedType === type.id ? 'bg-secondary text-white' : ''"
                    class="pa-4 card-fixed"
                    @click="selectType(type.id)"
                >
                    <div class="card-title">{{ type.label }}</div>
                    <div class="card-description">{{ type.description }}</div>
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
                        :class="selectedFormat === format.id ? 'bg-primary text-white' : ''"
                        class="pa-4 card-fixed"
                        @click="selectFormat(format.id)"
                    >
                        <div class="card-title">{{ format.label }}</div>
                        <div class="card-description">{{ format.description }}</div>
                    </v-card>
                </v-col>
            </v-row>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { LEAGUE_TYPES, LEAGUE_FORMATS } from '@/utils/code/code';

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

const emit = defineEmits(['update:leagueType', 'update:leagueFormat']);

const leagueTypes = LEAGUE_TYPES;
const leagueFormats = LEAGUE_FORMATS;

const selectedType = ref(props.leagueType);
const selectedFormat = ref(props.leagueFormat);

watch(() => props.leagueType, (val) => selectedType.value = val);
watch(() => props.leagueFormat, (val) => selectedFormat.value = val);

const selectType = (typeId) => {
    selectedType.value = typeId;
    selectedFormat.value = '';
    emit('update:leagueType', typeId);
    emit('update:leagueFormat', '');
};

const selectFormat = (formatId) => {
    selectedFormat.value = formatId;
    emit('update:leagueFormat', formatId);
};

const filteredFormats = computed(() =>
    leagueFormats.filter((format) => format.type === selectedType.value)
);
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
