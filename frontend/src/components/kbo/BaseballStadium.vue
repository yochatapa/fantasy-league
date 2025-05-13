<template>
    <div class="baseball-field">
        <svg viewBox="0 0 500 500" class="field">
            <!-- 필드 배경 -->
            <rect x="0" y="0" width="500" height="500" fill="#3b873e" />

            <!-- 내야 그라운드 (부채꼴) -->
            <path d="M250,460 L50,250 A220,180 0 0,1 450,250 L250,460 Z" fill="#d2b48c" stroke="#8b5e3c" stroke-width="2" />
            
            <!-- 다이아몬드 내부 잔디 -->
            <polygon points="250,450 150,347 250,250 347,346" fill="#3b873e" />

            <!-- 홈 플레이트 주변 원형 -->
            <circle cx="250" cy="448" r="20" fill="#d2b48c" stroke="#8b5e3c" stroke-width="2" />

            <!-- 투수 플레이트 원형 -->
            <circle cx="250" cy="347" r="20" fill="#d2b48c" stroke="#8b5e3c" stroke-width="2" />

            <!-- 다이아몬드 라인 (베이스라인) -->
            <line x1="250" y1="450" x2="80" y2="270" stroke="white" stroke-width="2" />
            <line x1="250" y1="450" x2="420" y2="270" stroke="white" stroke-width="2" />

            <!-- <line x1="0" y1="0" x2="500" y2="500" stroke="white" stroke-width="2" />
            <line x1="0" y1="500" x2="500" y2="0" stroke="white" stroke-width="2" />
            <line x1="250" y1="0" x2="250" y2="500" stroke="white" stroke-width="2" />
            <line x1="0" y1="250" x2="500" y2="250" stroke="white" stroke-width="2" /> -->

            <!-- 홈 베이스, 1루, 2루, 3루 -->
            <rect x="245" y="444" width="10" height="10" fill="white" stroke="black" />
            <rect x="342" y="341" width="10" height="10" fill="white" stroke="black" />
            <rect x="245" y="245" width="10" height="10" fill="white" stroke="black" />
            <rect x="148" y="341" width="10" height="10" fill="white" stroke="black" />
        </svg>

        <!-- 수비수 정보 -->
        <div v-for="(player, index) in defenders" :key="index" :style="getPlayerPosition(player)" class="player" @click="showPlayerInfo(player)">
            <span>{{ player.name }}</span>
        </div>

        <!-- 투수 정보 -->
        <div class="pitcher" :style="getPlayerPosition(pitcher)" @click="showPlayerInfo(pitcher)">
            <span>{{ pitcher.name }}</span>
        </div>

        <!-- 포수 정보 -->
        <div class="catcher" :style="getPlayerPosition(catcher)" @click="showPlayerInfo(catcher)">
            <span>{{ catcher.name }}</span>
        </div>

        <!-- 타자 정보 -->
        <div class="batter" :style="getPlayerPosition(batter)" @click="showPlayerInfo(batter)">
            <span>{{ batter.name }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const defenders = ref([
    { name: '1루수', position: '1B', x: 342, y: 321 },
    { name: '2루수', position: '2B', x: 310, y: 245 },
    { name: '유격수', position: 'SS', x: 190, y: 245 },
    { name: '3루수', position: '3B', x: 148, y: 321 },
    { name: '좌익수', position: 'LF', x: 50, y: 150 },
    { name: '중견수', position: 'CF', x: 250, y: 60 },
    { name: '우익수', position: 'RF', x: 450, y: 150 }
]);

const pitcher = ref({ name: '투수', position: 'P', x: 250, y: 343 });
const catcher = ref({ name: '포수', position: 'C', x: 250, y: 470 });
const batter = ref({ name: '타자', position: 'B', x: 275, y: 445 });

const getPlayerPosition = (player) => ({
    position: 'absolute',
    left: `${(player.x / 500) * 100}%`,
    top: `${(player.y / 500) * 100}%`,
    backgroundColor: '#333',
    color: 'white',
    borderRadius: '5px',
    padding: '2px 5px',
    fontSize: '12px',
    transform: 'translate(-50%, -50%)'
});
</script>

<style scoped>
.baseball-field {
    position: relative;
    width: 100%;
    height: auto;
    aspect-ratio: 1;
}
.field {
    width: 100%;
    height: 100%;
}
.player {
    position: absolute;
    cursor: pointer;
}
</style>