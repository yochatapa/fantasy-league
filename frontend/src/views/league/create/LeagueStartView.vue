<template>
    <v-container class="fill-height" fluid>
        <v-row
            align="center"
            justify="center"
            class="ma-0"
        >
            <v-col
                cols="12"
                md="5"
                class="pa-4"
            >
                <v-hover v-slot="{ isHovering, props }">
                    <v-card
                        v-bind="props"
                        class="pa-6 d-flex flex-column justify-center align-center text-center transition"
                        rounded="2xl"
                        :elevation="isHovering ? 8 : 4"
                        @click="router.push('/league/create')"
                        style="min-height: 280px; height: 100%;"
                    >
                        <v-icon size="64" class="mb-4" color="primary">mdi-crown</v-icon>
                        <h2 class="text-h4 font-weight-bold mb-4">리그 생성</h2>
                        <p class="text-body-2">직접 리그를 만들고 커미셔너가 되어보세요!</p>
                    </v-card>
                </v-hover>
            </v-col>

            <v-col
                cols="12"
                md="5"
                class="pa-4"
            >
                <v-hover v-slot="{ isHovering, props }">
                    <v-card
                        v-bind="props"
                        class="pa-6 d-flex flex-column justify-center align-center text-center transition"
                        rounded="2xl"
                        :elevation="isHovering ? 8 : 4"
                        @click="router.push('/league/join')"
                        style="min-height: 280px; height: 100%;"
                    >
                        <v-icon size="64" class="mb-4" color="secondary">mdi-account-multiple-plus</v-icon>
                        <h2 class="text-h4 font-weight-bold mb-4">리그 참가</h2>
                        <p class="text-body-2">초대 코드를 입력해 기존 리그에 참가하세요.</p>
                    </v-card>
                </v-hover>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>