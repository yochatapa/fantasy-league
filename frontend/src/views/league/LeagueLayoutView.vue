<template>
    <v-container>
        <!-- 메뉴 -->
        <v-row>
            <v-col cols="12" v-if="!mobile">
                <div class="horizontal-list">
                    <template v-for="(menu, index) in menus" :key="index">
                        <!-- 서브메뉴 없는 경우 -->
                        <router-link
                            v-if="menu.subMenu.length === 0"
                            :to="menu.path"
                            class="menu-item"
                            :class="{ active: isActive(menu.path) }"
                        >
                            {{ menu.name }}
                        </router-link>

                        <!-- 서브메뉴 있는 경우 -->
                        <div
                            v-else
                            class="menu-item with-sub"
                            @mouseenter="openDropdownIndex = index"
                            @mouseleave="openDropdownIndex = null"
                            :class="{ active: isParentActive(menu) }"
                        >
                            {{ menu.name }}
                            <v-icon size="20" class="ml-1">mdi-menu-down</v-icon>

                            <div v-if="openDropdownIndex === index" class="dropdown">
                                <router-link
                                    v-for="(subItem, subIndex) in menu.subMenu.filter((sub)=>sub.visible!==false)"
                                    :key="subIndex"
                                    :to="subItem.path"
                                    class="dropdown-item"
                                    :class="{ active: isActive(subItem.path) }"
                                >
                                    {{ subItem.name }}
                                </router-link>
                            </div>
                        </div>
                    </template>
                </div>
            </v-col>

            <!-- 모바일 메뉴 -->
            <v-col cols="12" v-else>
                <v-sheet elevation="6" rounded class="pa-4">
                    <v-row dense>
                        <v-col cols="6">
                            <v-select
                                v-model="selectedMainMenu"
                                :items="menus"
                                item-title="name"
                                :item-value="(menu) => menu"
                                label="메인 메뉴"
                                hide-details
                                dense
                                outlined
                                class="menu-select"
                            />
                        </v-col>

                        <v-col cols="6">
                            <v-select
                                v-model="selectedSubMenu"
                                :items="subMenuItems"
                                item-title="name"
                                :item-value="(subItem) => subItem"
                                label="서브 메뉴"
                                hide-details
                                dense
                                outlined
                                :disabled="!subMenuItems.length"
                                class="menu-select"
                            />
                        </v-col>
                    </v-row>
                </v-sheet>
            </v-col>
        </v-row>

        <!-- 콘텐츠 영역 -->
        <v-row>
            <v-col cols="12">
                <router-view />
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import { useRouter, useRoute } from 'vue-router';

const { mobile } = useDisplay();
const router = useRouter();
const route = useRoute();

const orgLeagueId = route.query.leagueId;

const menus = [
    {
        name: '리그 홈',
        path: `/league/home?leagueId=${encodeURIComponent(orgLeagueId)}`,
        subMenu: []
    },
    {
        name: '팀 관리',
        path: '/league/team-management',
        subMenu: [
            { name: '팀 정보', path: '/league/team-management/team-info' },
            { name: '팀 변경', path: '/league/team-management/team-changes' },
            { name: '선수 목록', path: '/league/team-management/players' },
            { name: '코칭스태프', path: '/league/team-management/coaches' }
        ]
    },
    {
        name: '경기 일정',
        path: '/league/schedule',
        subMenu: []
    },
    {
        name: '통계/순위',
        path: '/league/stats',
        subMenu: [
            { name: '개인 순위', path: '/league/stats/player-ranking' },
            { name: '팀 순위', path: '/league/stats/team-ranking' },
            { name: '경기 기록', path: '/league/stats/match-records' },
            { name: '선수 기록 상세', path: '/league/stats/player-records-detail' },
            { name: '팀 기록 상세', path: '/league/stats/team-records-detail' }
        ]
    },
    {
        name: '게시판',
        path: '/league/board',
        subMenu: [
            { name: '공지사항', path: '/league/board/announcements' },
            { name: '자유 게시판', path: '/league/board/free' },
            { name: 'Q&A', path: '/league/board/qa' }
        ]
    },
    {
        name: '자료실',
        path: '/league/resources',
        subMenu: []
    },
    {
        name: '소개',
        path: '/league/about',
        subMenu: [
            { name: '리그 소개', path: '/league/about/intro' },
            { name: '리그 규정', path: '/league/about/rules' }
        ]
    },
    {
        name: '설정 및 관리',
        path: '/league/admin',
        subMenu: [
            { name: '기본 설정', path: '/league/admin/general' },
            { name: '사용자 관리', path: '/league/admin/users' },
            { name: '권한 설정', path: '/league/admin/permissions' },
            { name: '리그 데이터 관리', path: '/league/admin/data' }
        ]
    },
    {
        name: 'FAQ',
        path: '/league/faq',
        subMenu: []
    }
];

const openDropdownIndex = ref(null);
const selectedMainMenu = ref(null);
const selectedSubMenu = ref(null);

const subMenuItems = computed(() => selectedMainMenu.value?.subMenu || []);

watch(selectedMainMenu, (newValue) => {
    selectedSubMenu.value = null;
    if (newValue) {
        if (newValue.subMenu?.length > 0) {
            selectedSubMenu.value = newValue.subMenu[0];
        } else if (newValue.path) {
            router.push(newValue.path);
        }
    }
});

watch(selectedSubMenu, (newValue) => {
    if (newValue?.path) {
        router.push(newValue.path);
    }
});

watch(mobile, (newValue) => {
    if (newValue && menus.length > 0) {
        selectedMainMenu.value = menus[0];
    }
});

onMounted(() => {
    const currentPath = route.path;
    for (const menu of menus) {
        if (menu.subMenu.length > 0) {
            const matched = menu.subMenu.find(sub => sub.path === currentPath);
            if (matched) {
                selectedMainMenu.value = menu;
                selectedSubMenu.value = matched;
                return;
            }
        } else if (menu.path === currentPath) {
            selectedMainMenu.value = menu;
            return;
        }
    }
});

// 현재 경로가 해당 path와 일치하는지 확인
const isActive = (path) => {
    const cleanRoutePath = route.path.split('?')[0]; // ? 뒤의 파라미터를 제거한 경로
    const cleanPath = path.split('?')[0]; // path에서 ? 뒤의 파라미터를 제거한 경로
    return cleanRoutePath === cleanPath;
};


// 서브메뉴 중 하나라도 활성화돼 있으면 부모도 활성화 처리
const isParentActive = (menu) => {
    return menu.subMenu.some(sub => isActive(sub.path));
};
</script>

<style scoped>
.horizontal-list {
    display: flex;
    gap: 16px;
    padding: 0 12px;
    align-items: center;
    position: relative;
}

.menu-item {
    position: relative;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
    color: #333;
    text-decoration: none;
    transition: background-color 0.2s ease;
}

.menu-item:hover {
    background-color: #f5f5f5;
}

.menu-item.active {
    background-color: #1976d2;
    color: white;
}

.menu-item.with-sub {
    display: flex;
    align-items: center;
    position: relative;
}

.menu-item.with-sub.active {
    background-color: #1976d2;
    color: white;
}

.dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 180px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0px 5px 5px -3px rgba(0, 0, 0, 0.2),
                0px 8px 10px 1px rgba(0, 0, 0, 0.14),
                0px 3px 14px 2px rgba(0, 0, 0, 0.12);
    z-index: 10;
}

.dropdown-item {
    display: block;
    padding: 10px 16px;
    color: #333;
    text-decoration: none;
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
}

.dropdown-item:hover {
    background-color: #f0f0f0;
}

.dropdown-item.active {
    background-color: #1976d2;
    color: white;
}

.menu-select {
    border-radius: 8px;
    box-shadow: 0px 5px 5px -3px rgba(0, 0, 0, 0.2),
                0px 8px 10px 1px rgba(0, 0, 0, 0.14),
                0px 3px 14px 2px rgba(0, 0, 0, 0.12);
}
</style>











<!-- <template>
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
    
    const orgLeagueId = route.query.leagueId;
    console.log(orgLeagueId)
    // 샘플 데이터 (이전과 동일)
    
    
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
    
    </style> -->