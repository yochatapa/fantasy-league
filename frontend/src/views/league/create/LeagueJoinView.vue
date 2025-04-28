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
                            required
                            hide-details
                            maxLength="6"
                        ></v-text-field>

                        <v-btn
                            type="submit"
                            color="secondary"
                            size="large"
                            class="mt-4"
                            block
                            :disabled="!inviteCode || inviteCode.length!==6"
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
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { encryptData, decryptData } from '@/utils/common/crypto.js';
import { useUserStore } from '@/stores/userStore.js'
import { commonFetch } from '@/utils/common/commonFetch';

const route = useRoute();
const router = useRouter();
const inviteCode = ref('');
const userStore = useUserStore();

const isLoggedIn = computed(() => userStore.isLoggedIn);

const inviteQuery = decodeURIComponent(route.query.inviteCode);

try {
    if(inviteQuery) inviteCode.value = decryptData(inviteQuery)    
} catch (error) {
    
}

const handleJoin = async () => {
    if (!inviteCode.value){
        return alert("초대코드를 입력하지 않았습니다.", "error")
    };

    if(inviteCode.value.length!==6){
        return alert("초대코드의 길이가 올바르지 않습니다.", "error")
    }
    
    if(!isLoggedIn.value){
        router.push("/login");
        return alert("로그인이 먼저 필요합니다.");
    }
    
    try{
        const response = await commonFetch(`/api/league/check-invite-code`,{
            method : "POST"
            , body : {
                inviteCode : inviteCode.value
            }
        })

        if(response.success){
            const leagueId = response.data.leagueId
            
            if(leagueId){
                const response2 = await commonFetch(`/api/league/join`,{
                    method : "POST"
                    , body : { leagueId }
                })

                if(response2.success){
                    alert(response2.message);
                    router.push(`/league/home?leagueId=${encodeURIComponent(encryptData(leagueId))}`)
                }else{
                    return alert(response2.message)
                }
            }
        }else{
            alert("올바르지 않은 초대 코드 입니다.")
        }
    }catch(error){

    }
};
</script>
