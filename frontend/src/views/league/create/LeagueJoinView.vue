<template>
    <v-container class="fill-height d-flex justify-center align-center" fluid>
        <v-row class="ma-0" style="width: 100%;" justify="center">
            <v-col cols="12" sm="8" md="6" lg="4">
                <v-card class="pa-6" rounded="2xl" elevation="6">
                    <div class="text-center mb-6">
                        <v-icon size="64" color="secondary" class="mb-2">mdi-key</v-icon>
                        <h2 class="text-h5 font-weight-bold mb-2">리그 참가</h2>
                        <p class="text-body-2">초대 코드를 입력하여 기존 리그에 참가하세요.</p>
                    </div>

                    <v-form @submit.prevent="handleJoin">
                        <v-text-field
                            v-model="inviteCode"
                            label="초대 코드"
                            variant="outlined"
                            density="comfortable"
                            required
                            hide-details
                        ></v-text-field>

                        <v-btn
                            type="submit"
                            color="secondary"
                            size="large"
                            class="mt-4"
                            block
                            :disabled="!inviteCode"
                        >
                            참가하기
                        </v-btn>
                    </v-form>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { encryptData, decryptData } from '@/utils/common/crypto.js';

const route = useRoute();
const router = useRouter();
const inviteCode = ref('');

const inviteQuery = route.query.invite_code;

try {
    if(inviteQuery) inviteCode.value = decryptData(inviteQuery)    
} catch (error) {
    
}

const handleJoin = () => {
    if (!inviteCode.value) return;
    // 실제 로직은 여기서 API 확인 후 리다이렉트
    router.push(`/league/${inviteCode.value}/detail`);
};
</script>
