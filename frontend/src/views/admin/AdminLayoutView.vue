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

const menus = [
    {
        name: '관리자 홈',
        path: '/admin',
        subMenu: []
    },
    {
        name: 'KBO 리그 관리',
        subMenu: [
            { name: 'KBO 팀 관리', path: '/admin/team/management' },
            { name: 'KBO 팀 추가', path: '/admin/team/add', visible: false},
            { name: 'KBO 선수 관리', path: '/league/kbo/players' },
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
