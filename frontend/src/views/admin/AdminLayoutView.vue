<template>
    <CommonLayout :menus="menus" />
</template>

<script setup>
import CommonLayout from '@/components/common/CommonLayout.vue';

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
            { name: 'KBO 선수 관리', path: '/admin/player/management' },
            { name: 'KBO 선수 추가', path: '/admin/player/add', visible: false},
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
</script>