<template>
    <v-card class="pa-4 stat-card" elevation="1">
        <!-- 스탯 이름 -->
        <div class="text-subtitle-2 font-weight-bold mb-3 text-center">
            {{ stat.label }} TOP 5
        </div>

        <!-- 1등 선수 -->
        <v-row align="center" no-gutters class="mb-3">
            <v-col cols="4">
                <v-avatar size="56">
                    <v-img
                        :src="stat.topPlayers[0].image || defaultImage"
                        alt="1등 선수"
                    />
                </v-avatar>
            </v-col>
            <v-col cols="8">
                <div class="font-weight-medium">
                    {{ stat.topPlayers[0].name }} ({{ stat.topPlayers[0].team }})
                </div>
                <div class="text-caption text-grey-darken-1">
                    {{ stat.topPlayers[0].value }}{{ stat.unit }}
                </div>
            </v-col>
        </v-row>

        <!-- 2~5위 -->
        <v-divider class="mb-2" />
        <v-list density="compact">
            <v-list-item
                v-for="(player, i) in stat.topPlayers.slice(1)"
                :key="i"
                class="py-1 px-2"
            >
                <v-list-item-title class="text-body-2">
                    {{ i + 2 }}위 {{ player.name }} ({{ player.team }})
                </v-list-item-title>
                <v-list-item-subtitle class="text-body-2 text-right font-weight-bold">
                    {{ player.value }}{{ stat.unit }}
                </v-list-item-subtitle>
            </v-list-item>
        </v-list>
    </v-card>
</template>

<script setup>
const props = defineProps({
    stat: Object
})

const defaultImage = 'https://via.placeholder.com/56'
</script>

<style scoped>
.stat-card {
    max-width: 360px;
    width: 100%;
}
</style>
