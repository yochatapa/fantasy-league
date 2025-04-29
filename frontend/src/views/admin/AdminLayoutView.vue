<template>
    <v-container>
        <v-row>
            <v-col cols="12" v-if="!mobile">
                <v-list dense class="horizontal-list">
                    <template v-for="(menu, index) in menus" :key="index">
                    <v-list-item
                        v-if="menu.subMenu.length === 0"
                        :to="menu.path"
                        link
                    >
                        <v-list-item-title>{{ menu.name }}</v-list-item-title>
                    </v-list-item>
        
                    <v-list-item v-else link>
                        <v-menu
                        bottom
                        offset-y
                        transition="slide-y-transition"
                        :open-on-hover="!isMobile"
                        close-on-content-click
                        >
                        <template v-slot:activator="{ props }">
                            <v-list-item-title v-bind="props" class="d-flex align-center">
                            {{ menu.name }}
                            <v-icon right>mdi-menu-down</v-icon>
                            </v-list-item-title>
                        </template>
        
                        <v-list>
                            <v-list-item
                            v-for="(subItem, subIndex) in menu.subMenu"
                            :key="subIndex"
                            :to="subItem.path"
                            link
                            >
                            <v-list-item-title>{{ subItem.name }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                        </v-menu>
                    </v-list-item>
                    </template>
                </v-list>
            </v-col>
      
            <v-col cols="12" v-else>
                <v-row dense>
                    <v-col cols="6">
                    <v-select
                        v-model="selectedMainMenu"
                        :items="menus"
                        item-title="name"
                        :item-value="(menu) => menu" label="메인 메뉴"
                        hide-details
                    ></v-select>
                    </v-col>
        
                    <v-col cols="6">
                    <v-select
                        v-model="selectedSubMenu"
                        :items="subMenuItems"
                        item-title="name"
                        :item-value="(subItem) => subItem" label="서브 메뉴"
                        hide-details
                        :disabled="!subMenuItems || subMenuItems.length === 0" ></v-select>
                    </v-col>
                </v-row>
            </v-col>
      
            <v-col cols="12">
              <router-view></router-view>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'; // onMounted import 필요
import { useDisplay } from 'vuetify';
import { useRoute, useRouter } from 'vue-router';

const { mobile } = useDisplay();
const route = useRoute();
const router = useRouter();

const isMobile = computed(() => mobile.value);

// 샘플 데이터 (이전과 동일)
const menus = [
    {
        name: '관리자 홈',
        path: '/admin',
        subMenu : []
    },
    {
        name: 'KBO 리그 관리',
        subMenu: [
            { name: 'KBO 팀 관리', path: '/admin/team/management' },
            { name: 'KBO 선수 관리', path: '/league/kbo/players' }
        ]
    },
    {
        name: '관리자 메뉴',
        path: '/league/system',
        subMenu: [
            { name: '리그 전체 설정', path: '/league/system/settings' },
            { name: '백업/복원', path: '/league/system/backup' }
        ]
    },

    {
        name: 'FAQ',
        path: '/league/faq',
        subMenu: []
    }
];


// 모바일 드롭다운에서 선택된 항목 상태
// 초기값 설정은 아래 onMounted 훅에서 처리
const selectedMainMenu = ref(null);
const selectedSubMenu = ref(null);


// 선택된 메인 메뉴에 따라 서브 메뉴 항목 목록을 계산하는 computed 속성
const subMenuItems = computed(() => {
    if (selectedMainMenu.value && selectedMainMenu.value.subMenu && selectedMainMenu.value.subMenu.length > 0) {
        return selectedMainMenu.value.subMenu;
    }
    return [];
});

// 메인 메뉴 선택 변경 감지 및 라우팅/서브메뉴 초기화
watch(selectedMainMenu, (newValue) => {
    // 메인 메뉴가 변경되면 서브 메뉴 선택을 초기화합니다.
    selectedSubMenu.value = null;

    if (newValue) {
        // 선택된 메인 메뉴에 서브 메뉴가 있는지 확인
        if (newValue.subMenu && newValue.subMenu.length > 0) {
            // 서브 메뉴가 있다면, 첫 번째 서브 메뉴를 기본 선택
            selectedSubMenu.value = newValue.subMenu[0];
            // selectedSubMenu watcher가 이 변경을 감지하고 라우팅을 처리합니다.
        } else {
        // 서브 메뉴가 없다면, 메인 메뉴의 경로로 바로 이동
        if (newValue.path) { // path가 있는지 확인
            router.push(newValue.path);
        }
        }
    }
}); // { immediate: true }는 초기 로딩 시 selectedMainMenu에 값이 설정될 때 watch 로직을 트리거합니다.

// 서브 메뉴 선택 변경 감지 및 라우팅
watch(selectedSubMenu, (newValue) => {
    // 서브 메뉴가 선택되었다면 해당 경로로 이동
    if (newValue && newValue.path) {
        router.push(newValue.path);
    }
});

watch(mobile, (newValue)=>{
    if(newValue && menus.length > 0){
        selectedMainMenu.value = menus[0];
    }
})

// 컴포넌트가 마운트된 후 초기 선택값 설정
onMounted(() => {
    const currentPath = route.path;

    // 현재 path에 해당하는 메뉴를 찾기
    for (const menu of menus) {
        // 서브 메뉴가 있는 경우
        if (menu.subMenu.length > 0) {
            const matchedSub = menu.subMenu.find(sub => sub.path === currentPath);
            if (matchedSub) {
                selectedMainMenu.value = menu;
                selectedSubMenu.value = matchedSub;
                return;
            }
        } else if (menu.path === currentPath) {
            selectedMainMenu.value = menu;
            selectedSubMenu.value = null;
            return;
        }
    }

    // 경로가 매칭되지 않았고 모바일이면 기본 선택
    if (mobile.value && menus.length > 0) {
        selectedMainMenu.value = menus[0];
    }
});

</script>

<style scoped>
/* Apply flexbox to the specific list class */
.horizontal-list {
    display: flex;
    flex-direction: row;
    padding: 0; /* Remove default v-list padding if needed */
    overflow-x: auto; /* 가로 스크롤 필요한 경우 */
    -webkit-overflow-scrolling: touch; /* 모바일 스크롤 부드럽게 */
    align-items: center; /* 세로 중앙 정렬 */
}

/* Hide scrollbar for Chrome, Safari and Opera */
.horizontal-list::-webkit-scrollbar {
    display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.horizontal-list {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
}


/* Style individual list items within the horizontal list */
.horizontal-list .v-list-item {
    padding: 0 16px; /* Adjust padding as needed */
    flex: 0 0 auto; /* Items do not grow or shrink, they keep their content width */
    /* 최소 너비 설정 (선택 사항) */
    /* min-width: 100px; */
    height: 48px; /* v-list-item 기본 높이 또는 원하는 높이 */
}

/* You might want to remove default v-list-item padding and add your own */
.horizontal-list .v-list-item-title {
    padding: 0; /* Remove default title padding */
    line-height: 1.2; /* 줄 높이 조정 */
}

.horizontal-list .v-list-item-content {
    padding: 0; /* 컨텐츠 패딩 제거 */
}


/* Adjust menu positioning if needed */
.v-menu__content {
    box-shadow: 0px 5px 5px -3px rgba(0, 0, 0, 0.2),
                0px 8px 10px 1px rgba(0, 0, 0, 0.14),
                0px 3px 14px 2px rgba(0, 0, 0, 0.12); /* Add a subtle shadow */
}

/* 모바일 드롭다운 간격 조정 */
.v-row.dense > .v-col {
    padding-top: 4px;
    padding-bottom: 4px;
}

/* v-select 레이블 기본 위치 조정 (선택 사항) */
/* .v-select .v-label {
    top: 10px !important;
} */

</style>