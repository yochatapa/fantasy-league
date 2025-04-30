<template>
    <v-row>
        <v-col
            cols="12"
            class="d-flex justify-space-between align-center"
        >
            <span class="text-h6 font-weight-bold">KBO 팀 목록</span>
            <v-btn
                color="primary"
                @click="goToAddTeam"
                class="ml-2"
            >
                팀 추가
            </v-btn>
        </v-col>
        <v-col cols="12">
            <v-data-table
                v-if="!mobile"
                :headers="headers"
                :items="teams"
                :loading="loading"
                v-model:page="page"
                v-model:items-per-page="itemsPerPage"
                class="elevation-1 mt-2"
                loading-text="팀 목록을 불러오는 중입니다..."
            >
                <template #item.index="{ index }">
                    {{ (page - 1) * itemsPerPage + index + 1 }}
                </template>
                <template #item.status="{ item }">
                    <v-chip :color="item.status === 'active' ? 'green' : 'red'" label>
                        {{ item.status === 'active' ? '활성' : '해체' }}
                    </v-chip>
                </template>
                <template #item.founding_year="{ item }">
                    <span>{{ item.founding_year }}년 ~ {{ item.disband_year ? item.disband_year + '년' : '' }}</span>
                </template>
                <template #item.disband_year="{ item }">
                    <span v-if="item.disband_year">{{ item.disband_year }}년</span>
                    <span v-else>-</span>
                </template>
            </v-data-table>
            <v-data-table
                v-else
                :headers="headers"
                :items="teams"
                :loading="loading"
                v-model:page="page"
                v-model:items-per-page="itemsPerPage"
                class="elevation-1 mt-2"
                loading-text="팀 목록을 불러오는 중입니다..."
                mobile
                hide-default-header
            >
                <template #item="{ item, index }">
                    <v-card class="mb-2 pa-3">
                        <div class="d-flex justify-space-between align-center mb-2">
                            <div class="text-subtitle-1 font-weight-bold">
                                #{{ (page - 1) * itemsPerPage + index + 1 }}
                            </div>
                            <v-chip :color="item.status === 'active' ? 'green' : 'red'" label size="small">
                                {{ item.status === 'active' ? '활성' : '해체' }}
                            </v-chip>
                        </div>
                        <div class="text-body-2">
                            <div><strong>팀명:</strong> {{ item.name }}</div>
                            <div><strong>창단:</strong> {{ item.founding_year }}년</div>
                            <div>
                                <strong>해체:</strong>
                                {{ item.disband_year ? item.disband_year + '년' : '-' }}
                            </div>
                        </div>
                    </v-card>
                </template>
            </v-data-table>
        </v-col>            
    </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { commonFetch } from '@/utils/common/commonFetch'; // 경로는 실제 commonFetch 위치에 맞게 수정
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';

const { mobile } = useDisplay();

const router = useRouter();

const teams = ref([]);
const loading = ref(false);
const page = ref(1)
const itemsPerPage = ref(10) // 기본값

const headers = [
    { title: '번호', value: 'index', width: 80 },
    { title: '팀명', value: 'name' },
    { title: '상태', value: 'status' },
    { title: '기간', value: 'founding_year' },
];

const fetchTeamList = async () => {
    try {
        loading.value = true;
        const response = await commonFetch('/api/admin/team/list', {
            method: 'GET'
        });

        if (response.success) {
            teams.value = response.data.teamList || [];
        } else {
            alert('팀 목록 조회에 실패했습니다.', 'error');
        }    
    } catch (error) {
        alert('팀 목록 조회에 실패했습니다.', 'error');
    } finally {
        loading.value = false;
    }
};

const goToAddTeam = () => {
    router.push("/admin/team/add")
}

onMounted(() => {
    fetchTeamList();
});
</script>
