<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <span class="text-h6 font-weight-bold">KBO 로스터 관리</span>
            </v-col>
            <v-row>
                <v-col col="12" md="8">
                    <v-card>
                        <v-card-title class="d-flex justify-space-between align-center">
                            <span class="text-h6">현 로스터 ({{ rosterList.filter(roster=>roster.left_date!==formattedDate).length }}인 등록)</span>
                            <div class="d-flex align-center">
                                <v-menu v-model="calendarOpen" transition="scale-transition" max-width="290">
                                    <template v-slot:activator="{ props }" class="d-flex align-center">
                                        <v-icon v-bind="props" class="mr-2">mdi-calendar</v-icon>
                                        <span class="text-h6" v-bind="props" >{{ formattedDate }}</span>
                                    </template>
                                    <v-date-picker 
                                        v-model="selectedDate"
                                        @update:model-value="getRoster"
                                    />
                                </v-menu>
                            </div>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <v-row dense>
                                <v-col
                                    v-for="(roster, index) in rosterList"
                                    :key="index"
                                    cols="12"
                                    md="6"
                                    lg="4"
                                >
                                    <v-card elevation="2">
                                        <v-card-text class="d-flex flex-column align-center">
                                            <v-avatar 
                                                size="120"
                                                class="mb-2 d-flex flex-column align-center"
                                            >
                                                <img 
                                                    :src="roster.path || '/default-profile.png'" 
                                                    alt="player-image"
                                                    class="object-cover"
                                                    style="width: 100%;height: 100%;"
                                                >
                                            </v-avatar>
                                            <div class="text-center">
                                                <span class="text-h6">{{ roster.player_name }} ({{ roster.uniform_number }})</span>
                                            </div>
                                            <v-card-subtitle class="text-center">
                                                <div><strong>등록일:</strong> {{ roster.joined_date || '-' }}</div>
                                                <div><strong>말소일:</strong> {{ roster.left_date || '-' }}</div>
                                            </v-card-subtitle>
                                        </v-card-text>
                                        <v-card-actions class="d-flex justify-space-around">
                                            <v-btn class="d-flex align-center" v-if="!!!roster.left_date">
                                                <v-icon @click="deactiveRoster(roster.roster_id)">mdi-block-helper</v-icon>
                                                말소
                                            </v-btn>
                                            <v-btn class="d-flex align-center">
                                                <v-icon color="error" @click="deleteRoster(roster.roster_id)">mdi-delete</v-icon>
                                                삭제
                                            </v-btn>
                                        </v-card-actions>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col col="12" md="4" >
                    <v-card>
                        <v-card-title class="d-flex justify-space-between align-center">
                            <span class="text-h6" @click="addRoster">로스터 추가</span>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <v-form v-model="valid" ref="rosterForm">
                                <v-row>
                                    <v-col col="12">
                                        <v-select
                                            v-model="player"
                                            label="선수"
                                            :items="playerList.filter(player=> !rosterList.find(roster=> roster.player_id === player.id))"
                                            item-title="visibleName"
                                            item-value="id"
                                            :rules="[v => !!v || '선수를 선택해주세요.']"
                                            required
                                        />
                                        <CommonDateInput
                                            v-model="joined_date"
                                            label="등록일"
                                            :min="selectedDate.getUTCFullYear()+'0101'"
                                            :max="selectedDate.getUTCFullYear()+'1231'"
                                            :rules="[v => !!v || '등록일을 선택해주세요.']"
                                            required
                                        />
                                        <CommonDateInput
                                            v-model="left_date"
                                            label="말소일"
                                            :min="selectedDate.getUTCFullYear()+'0101'"
                                            :max="selectedDate.getUTCFullYear()+'1231'"
                                        />
                                    </v-col>
                                </v-row>
                                <v-row>
                                    <v-col col="12" class="d-flex justify-end">
                                        <v-btn :disabled="!valid" color="primary" @click="addRoster">
                                            등록
                                        </v-btn>
                                    </v-col>
                                </v-row>
                            </v-form>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>            
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import CommonDateInput from '@/components/common/CommonDateInput.vue';
import { commonFetch } from '@/utils/common/commonFetch';
import { useRouter, useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { encryptData, decryptData } from '@/utils/common/crypto';
import { formatDate } from '@/utils/common/dateUtils.js';

const route = useRoute();
const router = useRouter();

const teamId = computed(() => route.query.teamId);

const selectedDate = ref(new Date());
const formattedDate = ref(formatDate(selectedDate.value));
const calendarOpen = ref(false);

const rosterList = ref([]);
const playerList = ref([]);

const player = ref(null);
const joined_date = ref(formattedDate.value);
const left_date = ref(null);
const valid = ref(false);

watch(()=>selectedDate.value, (newVal)=>{
    formattedDate.value = formatDate(newVal)
})

const getPlayerList = async (year) => {
    try {
        const params = new URLSearchParams();
        params.append('activeYears', year);
        params.append('teamIds', decryptData(teamId.value));
        const queryString = params.toString();
        const response = await commonFetch(`/api/admin/player/list?${queryString}`);

        if(response.success){
            playerList.value = response.data.playerList.map((player) => {
                return {
                    ...player
                    , visibleName : `(${player.current_uniform_number}) (${player.primary_position}) ${player.name}`
                };
            });
        }else{
            throw new Error()
        }
    } catch (error) {
        alert("선수 목록 조회 중 에러가 발생하였습니다.\n 다시 한 번 시도해주세요.", "error")
    }
}

const getRoster = async (date) => {
    try {
        const response = await commonFetch(`/api/admin/roster/list?date=${formatDate(date)}&teamId=${decryptData(teamId.value)}`);

        if(response.success){
            rosterList.value = response.data.rosterList;
        }else{
            throw new Error()
        }
    } catch (error) {
        alert("로스터 조회 중 에러가 발생하였습니다.\n 다시 한 번 시도해주세요.", "error")
    }
}

const addRoster = async () => {
    try {
        const response = await commonFetch(`/api/admin/roster/create`,{
            method : 'POST',
            body : {
                playerId : player.value
                , joinedDate : joined_date.value
                , leftDate : left_date.value
                , teamId : decryptData(teamId.value)
                , seasonYear : selectedDate.value.getUTCFullYear()
            }
        });

        if(response.success){
            alert("성공적으로 추가되었습니다.");
            await getRoster(selectedDate.value);
            player.value = null;
            joined_date.value = formattedDate.value;
            left_date.value = null;
        }else{
            throw new Error()
        }
    } catch (error) {
        alert("로스터 저장 중 에러가 발생하였습니다.\n 다시 한 번 시도해주세요.", "error")
    }
}

const deactiveRoster = async (id) => {
    try {
        const response = await commonFetch(`/api/admin/roster/deactive`,{
            method : 'PUT',
            body : {
                rosterId : id
                , leftDate : formattedDate.value
            }
        });

        if(response.success){
            alert("성공적으로 말소되었습니다.");
            await getRoster(selectedDate.value);
        }else{
            throw new Error()
        }
    } catch (error) {
        alert("로스터 말소 중 에러가 발생하였습니다.\n 다시 한 번 시도해주세요.", "error")
    }
}

const deleteRoster = async (id) => {
    try {
        const response = await commonFetch(`/api/admin/roster/delete`,{
            method : 'DELETE',
            body : {
                rosterId : id
            }
        });

        if(response.success){
            alert("성공적으로 삭제되었습니다.");
            await getRoster(selectedDate.value);
        }else{
            throw new Error()
        }
    } catch (error) {
        alert("로스터 삭제 중 에러가 발생하였습니다.\n 다시 한 번 시도해주세요.", "error")
    }
}

onMounted(async ()=>{
    Promise.all([
        getPlayerList(selectedDate.value.getUTCFullYear())
        , getRoster(selectedDate.value)
    ])
})
</script>