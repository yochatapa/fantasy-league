<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12">
                <LeagueInfoCard />
            </v-col>

            <v-col cols="12">
                <KboNewsSection />
            </v-col>

            <v-col cols="12">
                <PlayerStatsSection />
            </v-col>

            <v-col cols="12">
                <GameScheduleSection />
            </v-col>

            <v-col cols="12">
                <PlayerSearchSection />
            </v-col>

            <v-col cols="12">
                <EventBanner />
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import LeagueInfoCard from '@/components/common/home/LeagueInfoCard.vue'
import KboNewsSection from '@/components/common/home/KboNewsSection.vue'
import PlayerStatsSection from '@/components/common/home/PlayerStatsSection.vue'
import GameScheduleSection from '@/components/common/home/GameScheduleSection.vue'
import PlayerSearchSection from '@/components/common/home/PlayerSearchSection.vue'
import EventBanner from '@/components/common/home/EventBanner.vue'
</script>
