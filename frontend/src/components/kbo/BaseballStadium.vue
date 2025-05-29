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
            <rect x="342" y="341" width="10" height="10" :fill="gameCurrentInfo.runner_1b?.player_id?'red':'white'" stroke="black"/>
            <rect x="245" y="245" width="10" height="10" :fill="gameCurrentInfo.runner_2b?.player_id?'red':'white'" stroke="black" />
            <rect x="148" y="341" width="10" height="10" :fill="gameCurrentInfo.runner_3b?.player_id?'red':'white'" stroke="black" />
        </svg>

        <!-- 수비수 정보 -->
        <div v-for="(player, index) in defenders" :key="index" :style="getPlayerPosition(player)" class="player" @click="showPlayerInfo(player)">
            <span>{{ lineupList
                    .flatMap(inning => inning[isAway ? 'home' : 'away'])
                    .filter(lPlayer => lPlayer?.position?.toLowerCase() === player.position.toLowerCase())
                    .sort((a, b) => {
                        if (a.replaced_inning !== b.replaced_inning) {
                            return b.replaced_inning - a.replaced_inning;
                        }
                        return b.replaced_out - a.replaced_out;
                    })[0].replaced_player_name
                    ??lineupList
                    .flatMap(inning => inning[isAway ? 'home' : 'away'])
                    .filter(lPlayer => lPlayer?.position?.toLowerCase() === player.position.toLowerCase())
                    .sort((a, b) => {
                        if (a.replaced_inning !== b.replaced_inning) {
                            return b.replaced_inning - a.replaced_inning;
                        }
                        return b.replaced_out - a.replaced_out;
                    })[0]
                    .player_name }}</span>
        </div>

        <!-- 투수 정보 -->
        <div class="pitcher" :style="getPlayerPosition(pitcher)" @click="showPlayerInfo(pitcher)">
            <span>{{ currentPitcher.replaced_player_name??currentPitcher.player_name }}</span>
        </div>

        <!-- 포수 정보 -->
        <!-- <div class="catcher" :style="getPlayerPosition(catcher)" @click="showPlayerInfo(catcher)">
            <span>{{ catcher.name }}</span>
        </div> -->

        <!-- 타자 정보 -->
        <div class="batter" :style="getPlayerPosition(batter)" @click="showPlayerInfo(batter)">
            <span>{{ currentBatter.replaced_player_name??currentBatter.player_name }}</span>
        </div>

        <div class="position-absolute bottom-0 text-white mb-3 ml-3">
            <span class="text-subtitle-1 font-weight-bold">
                {{ gameCurrentInfo.inning }}회 {{ gameCurrentInfo.inning_half==="top"?'🔺':'🔻' }}
            </span>
            <div>
                <span style="width: 20px;display: inline-flex;">S : </span><span v-for="number in 2"><span v-if="number<=gameCurrentInfo.strike">🟡</span><span v-else>⚫</span></span>
            </div>
            <div>
                <span style="width: 20px;display: inline-flex">B : </span><span v-for="number in 3"><span v-if="number<=gameCurrentInfo.ball">🟢</span><span v-else>⚫</span></span>
            </div>
            <div>
                <span style="width: 20px;display: inline-flex">O : </span><span v-for="number in 2"><span v-if="number<=gameCurrentInfo.out">🔴</span><span v-else>⚫</span></span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    gamedayInfo: Object,
    currentInning: Number,
    gameCurrentInfo: Object,
    lineupList : Object,
    currentBatter : Object,
    currentPitcher : Object,
})

const lineupList = computed(()=>props.lineupList)
const gameCurrentInfo = computed(()=>props.gameCurrentInfo)
const isAway = computed(()=>gameCurrentInfo.value.inning_half === 'top');
const currentBatter = computed(()=>props.currentBatter)
const currentPitcher = computed(()=>props.currentPitcher)

const defenders = ref([
    { name: '1루수', position: '1B', x: 342, y: 321 },
    { name: '2루수', position: '2B', x: 310, y: 245 },
    { name: '유격수', position: 'SS', x: 190, y: 245 },
    { name: '3루수', position: '3B', x: 148, y: 321 },
    { name: '좌익수', position: 'LF', x: 80, y: 150 },
    { name: '중견수', position: 'CF', x: 250, y: 70 },
    { name: '우익수', position: 'RF', x: 420, y: 150 },
    { name: '포수', position: 'C', x: 250, y: 470 },
]);

const pitcher = ref({ name: '투수', position: 'P', x: 250, y: 343 });
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