import { createRouter, createWebHistory, RouterView  } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import HomeView from '@/views/common/HomeView.vue'
import LoginView from '@/views/common/login/LoginView.vue'
import SignupView from '@/views/common/signup/SignupView.vue'
// league
import LeagueStartView from '@/views/league/create/LeagueStartView.vue'
import LeagueCreateView from '@/views/league/create/LeagueCreateView.vue'
import LeagueJoinView from '@/views/league/create/LeagueJoinView.vue'
import LeagueCreateCompleteView from '@/views/league/create/LeagueCreateCompleteView.vue'
import LeagueLayoutView from '@/views/league/LeagueLayoutView.vue'
import LeagueHomeView from '@/views/league/home/LeagueHomeView.vue'

import AdminLayoutView from '@/views/admin/AdminLayoutView.vue'
import KboTeamManagementView from '@/views/admin/kbo/team/KboTeamManagementView.vue'
import KboTeamAddView from '@/views/admin/kbo/team/KboTeamAddView.vue'
import KboPlayerManagementView from '@/views/admin/kbo/player/KboPlayerManagementView.vue'
import KboPlayerAddView from '@/views/admin/kbo/player/KboPlayerAddView.vue'
import KboGameManagementView from '@/views/admin/kbo/game/KboGameManagementView.vue'
import KboRosterManagementView from '@/views/admin/kbo/team/KboRosterManagementView.vue'

import KboGameDetailView from '@/views/kbo/game/KboGameDetailView.vue'
// import KboGameAddView from '@/views/admin/kbo/game/KboGameAddView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: RouterView,
            children: [
                {
                    path: '',
                    name: 'home',
                    component: HomeView,
                },
                {
                    path: 'login',
                    name: 'login',
                    component: LoginView,
                },
                {
                    path: 'signup',
                    name: 'signup',
                    component: SignupView,
                },
                {
                    path: '/kbo/game/detail/:encryptedGameId',
                    name: 'KboGameDetailView',
                    component: KboGameDetailView,
                    props: true,
                },
                {
                    path: 'league/start',
                    name: 'LeagueStart',
                    component: LeagueStartView,
                    meta : {
                        requiresAuth : true
                    }
                },
                {
                    path: 'league/create',
                    name: 'LeagueCreate',
                    component: LeagueCreateView,
                    meta : {
                        requiresAuth : true
                    }
                },
                {
                    path: 'league/create/complete',
                    name: 'LeagueCreateCompleteView',
                    component: LeagueCreateCompleteView,
                    meta : {
                        requiresAuth : true
                    }
                },
                {
                    path: 'league/join',
                    name: 'LeagueJoin',
                    component: LeagueJoinView,
                    meta : {
                        requiresAuth : true
                    }
                },
                {
                    path: 'league',
                    component: LeagueLayoutView, // 서브 레이아웃 또는 view
                    meta : {
                        requiresAuth : true
                    },
                    children: [
                        {
                            path: 'home',
                            name: 'LeagueHomeView',
                            component: LeagueHomeView,
                        }
                    ]
                }
            ]
        },
        {
            path: '/admin',
            component: RouterView,
            meta: { requiresAuth: true, requiresAdmin: true },
            children: [
                {
                    path: '',
                    name: 'AdminLayoutView',
                    component: AdminLayoutView,
                    children : [
                        {
                            path: 'team/management',
                            name: 'KboTeamManagementView',
                            component: KboTeamManagementView,
                        },
                        {
                            path: 'team/add',
                            name: 'KboTeamAddView',
                            component: KboTeamAddView,
                        },
                        {
                            path: 'roster/management',
                            name: 'KboRosterManagementView',
                            component: KboRosterManagementView,
                        },
                        {
                            path: 'player/management',
                            name: 'KboPlayerManagementView',
                            component: KboPlayerManagementView,
                        },
                        {
                            path: 'player/add',
                            name: 'KboPlayerAddView',
                            component: KboPlayerAddView,
                        },
                        {
                            path: 'game/management',
                            name: 'KboGameManagementView',
                            component: KboGameManagementView,
                        },
                    ]
                }
            ]
        }
    ],
    scrollBehavior(to, from, savedPosition) {
        // 1. 브라우저 저장 위치가 있으면 (뒤로/앞으로가기)
        if (savedPosition) {
            return savedPosition;
        }

        // 2. 해시가 있는 경우 (#anchor)
        if (to.hash) {
            return {
                el: to.hash,
                behavior: 'smooth', // 선택: 부드러운 스크롤
            };
        }

        // 3. 그 외엔 항상 맨 위로
        return { top: 0, left: 0 };    
    },
})

router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()

    if (to.meta.requiresAuth) {
    // 아직 로그인 안 되어 있으면 인증 확인
        if (!userStore.isLoggedIn) {
            const ok = await userStore.checkAuth()
            if (!ok){
                alert("로그인을 먼저 해주세요.")
                return next('/login')
            }
        }
    }

    if (to.meta.requiresAdmin) {
            if (!userStore.isAdmin) {
                const ok = await userStore.checkAdmin()
                if (!ok){
                    alert("관리자만 접근할 수 있습니다.")
                    return next('/')
                }
            }
        }

    next()
})

export default router
