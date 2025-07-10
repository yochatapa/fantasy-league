<template>
    <v-container>
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
                <v-data-table-server
                    v-if="!mobile"
                    :headers="headers"
                    :items="teams"
                    :loading="loading"
                    :items-length="totalItems"
                    v-model:page="page"
                    v-model:items-per-page="itemsPerPage"
                    class="elevation-1 mt-2"
                    loading-text="팀 목록을 불러오는 중입니다..."
                    @click:row="handleRowClick"
                >
                    <template #item.name="{ item }">
                        <div class="d-flex align-center justify-center">
                            <img :src="item.path" v-if="item.path" class="mr-2" style="height: 30px;" :alt="item.name+'로고'">{{ item.name }}
                        </div>
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
                    <template #item.id="{ item }">
                        <v-btn color="secondary" v-if="item.status === 'active'" @click.native.stop="goToRosterManagement(item.id)">로스터 관리</v-btn>
                    </template>
                </v-data-table-server>
                
                <v-data-table-server
                    v-else
                    :headers="headers"
                    :items="teams"
                    :loading="loading"
                    :items-length="totalItems"
                    v-model:page="page"
                    v-model:items-per-page="itemsPerPage"
                    class="mt-2"
                    loading-text="팀 목록을 불러오는 중입니다..."
                    mobile
                    hide-default-header
                    style="background: transparent; border: 0;"
                >
                    <template #item="{ item, index }">
                        <v-card class="mb-2 pa-3" @click="(event) => handleRowClick(event, { item })">
                            <div class="d-flex justify-space-between align-center mb-2">
                                <div class="text-subtitle-1 font-weight-bold">
                                    # {{ item.row_number }}
                                    <v-chip :color="item.status === 'active' ? 'green' : 'red'" label size="small">
                                        {{ item.status === 'active' ? '활성' : '해체' }}
                                    </v-chip>
                                </div>
                                <v-btn color="secondary" @click.native.stop="goToRosterManagement(item.id)">로스터 관리</v-btn>
                            </div>
                            <div class="text-body-2">
                                <div class="d-flex align-center"><strong>팀명:</strong> <img :src="item.path" v-if="item.path" class="mx-1 mb-1" style="height: 24px;" :alt="item.name+'로고'">{{ item.name }}</div>
                                <div><strong>창단:</strong> {{ item.founding_year }}년</div>
                                <div>
                                    <strong>해체:</strong>
                                    {{ item.disband_year ? item.disband_year + '년' : '-' }}
                                </div>
                            </div>
                        </v-card>
                    </template>
                </v-data-table-server>
            </v-col>            
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { commonFetch } from '@/utils/common/commonFetch';
import { useRouter, useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { encryptData } from '@/utils/common/crypto';

const { mobile } = useDisplay();
const router = useRouter();
const route = useRoute();

const teams = ref([]);
const loading = ref(false);
const page = ref(route.query.page || 1);
const itemsPerPage = ref(10);
const totalItems = ref(0);

const headers = [
    { title: '번호', value: 'row_number', width: 80, align: 'center' },
    { title: '팀명', value: 'name', align: 'center' },
    { title: '상태', value: 'status', align: 'center' },
    { title: '기간', value: 'founding_year', align: 'center' },
    { title: '', value : 'id', align: 'center', width: 100}
];

const fetchTeamList = async () => {
    try {
        loading.value = true;
        const response = await commonFetch(`/api/admin/team/list?page=${page.value}&itemsPerPage=${itemsPerPage.value}`, {
            method: 'GET',
        });

        if (response.success) {
            teams.value = response.data.teamList || [];
            totalItems.value = Number(response.data.total) || 0;
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
    router.push('/admin/team/add');
};

const goToRosterManagement = (id) => {
    router.push(`/admin/roster/management?teamId=${encodeURIComponent(encryptData(id))}`);
}

const handleRowClick = (e, { item }) => {
    router.push(`/admin/team/add?teamId=${encodeURIComponent(encryptData(item.id))}`);
};

// ✅ 1. 마운트 시 쿼리로 page 설정
onMounted(() => {
    const queryPage = Number(route.query.page);
    if (!isNaN(queryPage) && queryPage > 0) {
        page.value = queryPage;
    }
    fetchTeamList();
});

// ✅ 2. page 또는 itemsPerPage 변경 시
watch([page, itemsPerPage], () => {
    fetchTeamList();
    
    // router.replace로 URL 쿼리 업데이트 (뒤로가기 히스토리 X)
    router.replace({
        query: {
            ...route.query,
            page: String(page.value)
        }
    });
});

</script>
