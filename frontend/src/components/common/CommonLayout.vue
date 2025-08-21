<template>
    <!-- 메뉴 -->
    <v-row class="bg-grey-lighten-5 position-sticky py-1" style="top: 64px;z-index: 1;">
        <v-col cols="12" v-if="!mobile">
            <div class="horizontal-list">
                <template v-for="(menu, index) in menus" :key="index">
                    <router-link
                        v-if="menu.subMenu.length === 0"
                        :to="isActive(menu.path)?route.fullPath:menu.path"
                        class="menu-item"
                        :class="{ active: selectedMainIndex === index }"
                    >
                        {{ menu.name }}
                    </router-link>

                    <div
                        v-else
                        class="menu-item with-sub"
                        @mouseenter="openDropdownIndex = index"
                        @mouseleave="openDropdownIndex = null"
                        :class="{ active: selectedMainIndex === index }"
                    >
                        {{ menu.name }}
                        <v-icon size="20" class="ml-1">mdi-menu-down</v-icon>

                        <div v-if="openDropdownIndex === index" class="dropdown">
                            <router-link
                                v-for="(subItem, subIndex) in menu.subMenu.filter((sub)=>sub.visible!==false)"
                                :key="subIndex"
                                :to="isActive(subItem.path)?route.fullPath:subItem.path"
                                class="dropdown-item"
                                :class="{ active: selectedMainIndex === index && selectedSubIndex === subIndex }"
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
            <v-row dense align="center">
                <v-icon @click="drawer = true" class="mr-1">mdi-menu</v-icon>
                <div class="menu-display">
                    <span class="main-menu-name">{{ selectedMainMenu?.name ?? '' }}</span>
                    <span v-if="selectedSubMenu" class="sub-menu-name"> / {{ selectedSubMenu?.name }}</span>
                </div>

                <v-navigation-drawer v-model="drawer" app temporary>
                    <v-list>
                        <v-list-item
                            v-if="menus.length === 1 && menus[0].subMenu.length === 0"
                            :to="isActive(menus[0].path)?route.fullPath:menus[0].path"
                            :title="menus[0].name"
                            @click="drawer = false"
                            :class="{ active: isActive(menu.path) }"
                        ></v-list-item>
                        <template v-for="(menu, index) in menus" :key="`mobile-menu-${index}`">
                            <v-list-item
                                v-if="menu.subMenu.length === 0"
                                :title="menu.name"
                                :to="isActive(menu.path)?route.fullPath:menu.path"
                                @click="drawer = false"
                                :class="{ active: isActive(menu.path) }"
                                active-class=""
                                exact
                            ></v-list-item>
                            <v-list-group v-else :value="menu.name">
                                <template v-slot:activator="{ props }">
                                    <v-list-item
                                        v-bind="props"
                                        :title="menu.name"
                                        :class="{ active: selectedMainIndex === index, expend: isExpandedList[index]}"
                                        @click="isExpandedList[index] = !isExpandedList[index];"
                                    ></v-list-item>
                                    <v-divider v-if="isExpandedList[index]"></v-divider>
                                </template>
                                <v-list-item
                                    v-for="(subItem, subIndex) in menu.subMenu.filter(sub => sub.visible !== false)"
                                    :key="`mobile-sub-menu-${index}-${subIndex}`"
                                    :to="isActive(subItem.path)?route.fullPath:subItem.path"
                                    class="sub-menu-item"
                                    :class="{ active: selectedMainIndex === index && selectedSubIndex === subIndex }"
                                    :title="subItem.name"
                                    @click="drawer = false"
                                    active-class=""
                                    exact
                                ></v-list-item>
                            </v-list-group>
                            <v-divider v-if="index < menus.length - 1"></v-divider>
                        </template>
                    </v-list>
                </v-navigation-drawer>
            </v-row>
        </v-col>
    </v-row>
    <!-- 콘텐츠 영역 -->
    <v-row>
        <v-col cols="12">
            <router-view v-slot="{ Component }" :league-info="leagueInfo" :season-info="seasonInfo" :current-season-info="currentSeasonInfo" :draft-teams="draftTeams" :draft-room="draftRoom" > 
                <component :is="Component" :league-info="leagueInfo" :season-info="seasonInfo" :current-season-info="currentSeasonInfo" :draft-teams="draftTeams" :draft-room="draftRoom" /> 
            </router-view>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useRouter, useRoute } from 'vue-router';
import { id } from 'vuetify/locale';

const props = defineProps({
    menus: Array,
    leagueInfo: Object,
    seasonInfo: Object,
    currentSeasonInfo: Object,
    draftTeams: Array,
    draftRoom: Object
});

const { mobile } = useDisplay();
const router = useRouter();
const route = useRoute();

const drawer = ref(false);
const selectedMainMenu = ref(null);
const selectedMainIndex = ref(null);
const selectedSubMenu = ref(null);
const selectedSubIndex = ref(null)

const openDropdownIndex = ref(null);
const menus = props.menus;

const isExpandedList = ref(Array(menus.filter(menu=>menu.subMenu).length).fill(false))

const isActive = (path) => {
    const cleanRoutePath = route?.fullPath.split('?')[0];
    const cleanPath = path?.split('?')[0];
    return cleanRoutePath === cleanPath;
};

const setActiveMenu = () => {
    selectedMainIndex.value = null;
    selectedMainMenu.value = null;
    selectedSubMenu.value = null;
    selectedSubIndex.value = null;

    for (let idx=0;idx<menus.length;idx++) {
        const menu = menus[idx];
        if (isActive(menu.path)) {
            selectedMainMenu.value = menu;
            selectedMainIndex.value = idx;
            return;
        }

        for(let idx2=0;idx2<menu.subMenu.length;idx2++){
            const subMenu = menu.subMenu[idx2];

            if (isActive(subMenu.path)) {
                selectedMainMenu.value = menu;
                selectedMainIndex.value = idx;
                selectedSubMenu.value = subMenu;
                selectedSubIndex.value = idx2;
                return;
            }

            if(subMenu.subMenu){
                const matchedSub = subMenu.subMenu?.find(sub => isActive(sub.path));
                if (matchedSub) {
                    selectedMainMenu.value = menu;
                    selectedMainIndex.value = idx;
                    selectedSubMenu.value = subMenu;
                    selectedSubIndex.value = idx2;
                    return;
                }
            }
        }
    }
};

const isParentActive = (menu) => {
    return menu.subMenu.some(sub => isActive(sub.path));
};

watch(route, () => {
    setActiveMenu();
}, { immediate: true });
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
    overflow: hidden;
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

.menu-display {
    display: flex;
    align-items: center;
    font-size: 16px;
    margin-left: 8px;
    gap: 4px;
}

.main-menu-name {
    font-weight: bold;
}

.sub-menu-name {
    color: gray;
}

:deep(.active .v-list-item__overlay){
    background: transparent !important;
}

:deep(.active .v-list-item__content){
    padding: 4px 10px;
    border-radius: 10px;
    background-color: #1976d2;
    
    color: white;
}

:deep(a.active .v-list-item__content){
    transform: translateX(-10px);
}

:deep(.v-navigation-drawer__scrim){
    width: 100vw;
    height: 100vh;
    top: -11px;
    left: -4px;
}

.v-navigation-drawer__scrim{
    background-color: unset;
}
</style>
