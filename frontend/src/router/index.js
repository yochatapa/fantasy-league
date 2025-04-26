import { createRouter, createWebHistory, RouterView  } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import HomeView from '@/views/common/HomeView.vue'
import LoginView from '@/views/common/login/LoginView.vue'
import SignupView from '@/views/common/signup/SignupView.vue'
// league
import LeagueStartView from '@/views/league/create/LeagueStartView.vue'
import LeagueCreateView from '@/views/league/create/LeagueCreateView.vue'
import LeagueJoinView from '@/views/league/create/LeagueJoinView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView,
        },
        {
            path: '/signup',
            name: 'signup',
            component: SignupView,
        },
        {
          path: '/league',
          component: RouterView ,
          children: [
              {
                  path: 'start',
                  name: 'LeagueStart',
                  component: LeagueStartView,
              },
              {
                  path: 'create',
                  name: 'LeagueCreate',
                  component: LeagueCreateView,
              },
              {
                  path: 'join',
                  name: 'LeagueJoin',
                  component: LeagueJoinView,
              }
          ]
      }
    ],
    scrollBehavior(to, from, savedPosition) {
        // savedPosition은 뒤로가기/앞으로가기 버튼으로 이동했을 때
        // 브라우저에 의해 저장된 스크롤 위치입니다.
        if (savedPosition) {
          return savedPosition; // 저장된 위치가 있으면 그 위치로 이동
        } else {
          // 저장된 위치가 없으면 (새로운 경로로 이동할 때)
          // 항상 페이지 맨 위 (0, 0)로 스크롤
          return { top: 0, left: 0 };
        }
        // 만약 URL에 해시(#)가 있다면 해당 요소로 스크롤되게 할 수도 있습니다.
        if (to.hash) {
          return {
            el: to.hash, // 해시에 해당하는 요소를 찾아서 스크롤
            behavior: 'smooth', // 부드럽게 스크롤 (선택 사항)
          };
        }
      },
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth) {
    // 아직 로그인 안 되어 있으면 인증 확인
    if (!userStore.isLoggedIn) {
      const ok = await userStore.checkAuth()
      if (!ok) return next('/login')
    }
  }

  next()
})

export default router
