<template>
    <CommonLayout :menus="menus" />
</template>

<script setup>
import CommonLayout from '@/components/common/CommonLayout.vue';
import { useRouter, useRoute } from 'vue-router';

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
</script>