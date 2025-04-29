<!-- src/views/AdminTeamListView.vue -->
<template>
    <v-container>
        <v-card class="pa-4">
            <v-card-title>
                KBO 팀 목록
            </v-card-title>
            <v-data-table
                :headers="headers"
                :items="teams"
                :loading="loading"
                class="elevation-1 mt-4"
                loading-text="팀 목록을 불러오는 중입니다..."
            >
                <template #item.index="{ index }">
                    {{ index + 1 }}
                </template>
            </v-data-table>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { commonFetch } from '@/utils/common/commonFetch'; // 경로는 실제 commonFetch 위치에 맞게 수정

const teams = ref([]);
const loading = ref(false);

const headers = [
    { text: '번호', value: 'index', width: 80 },
    { text: '팀명', value: 'name' },
    { text: '연고지', value: 'location' },
    { text: '창단연도', value: 'founded_year' },
];

const fetchTeamList = async () => {
    try {
        loading.value = true;
        const response = await commonFetch('/api/admin/team/list', {
            method: 'GET'
        });

        if (response.success) {
            teams.value = response.data || [];
        } else {
            alert('팀 목록 조회에 실패했습니다.', 'error');
        }    
    } catch (error) {
        alert('팀 목록 조회에 실패했습니다.', 'error');
    }finally{
        loading.value = false;
    }
};

onMounted(()=>{
    fetchTeamList();
});
</script>
