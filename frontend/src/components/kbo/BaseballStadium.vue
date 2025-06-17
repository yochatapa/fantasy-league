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
        <div
            v-for="(player, index) in defenders"
            :key="index"
            :style="getPlayerPosition(player)"
            class="player"
            @click="showPlayerInfo(currentDefenders.get(player.position) || null)"
        >
            <span>
                {{
                    currentDefenders.get(player.position)?.replaced_player_name
                    || currentDefenders.get(player.position)?.player_name
                    || '-'
                }}
            </span>
        </div>

        <!-- 투수 정보 -->
        <div v-if="currentPitcher?.player_id" class="pitcher" :style="getPlayerPosition(pitcher)" @click="showPlayerInfo(pitcher)">
            <span>{{ currentPitcher.replaced_player_name??currentPitcher.player_name }}</span>
        </div>

        <div v-if="gameCurrentInfo.runner_1b?.player_id" class="runner" :style="getPlayerPosition(runner_1b,false)" @click="showPlayerInfo(runner_1b)">
            <span>{{ gameCurrentInfo.runner_1b?.replaced_player_name??gameCurrentInfo.runner_1b?.player_name }}</span> 
        </div>

        <div v-if="gameCurrentInfo.runner_2b?.player_id" class="runner" :style="getPlayerPosition(runner_2b,false)" @click="showPlayerInfo(runner_2b)">
            <span>{{ gameCurrentInfo.runner_2b?.replaced_player_name??gameCurrentInfo.runner_2b?.player_name }}</span> 
        </div>

        <div v-if="gameCurrentInfo.runner_3b?.player_id" class="runner" :style="getPlayerPosition(runner_3b,false)" @click="showPlayerInfo(runner_3b)">
            <span>{{ gameCurrentInfo.runner_3b?.replaced_player_name??gameCurrentInfo.runner_3b?.player_name }}</span> 
        </div>

        <!-- 포수 정보 -->
        <!-- <div class="catcher" :style="getPlayerPosition(catcher)" @click="showPlayerInfo(catcher)">
            <span>{{ catcher.name }}</span>
        </div> -->

        <!-- 타자 정보 -->
        <div v-if="currentBatter?.player_id" class="batter" :style="getPlayerPosition(batter,false)" @click="showPlayerInfo(batter)">
            <span>{{ currentBatter.replaced_player_name??currentBatter.player_name }}</span>
        </div>

        <div class="position-absolute bottom-0 text-white mb-3 ml-3 text-caption">
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

        <div class="position-absolute bottom-0 right-0 mb-3 mr-3 text-white text-caption">
            <div>
                <span class="font-weight-bold text-caption">{{ currentBatter?.batting_order }}번 : {{ currentBatter?.replaced_player_name??currentBatter?.player_name }}</span>
                <div>
                    {{ currentBatter?.stats?.at_bats }}타수 {{ currentBatter?.stats?.hits }}안타
                </div>
                <div>
                    {{ currentBatter?.stats?.runs }}득점 {{ currentBatter?.stats?.rbis }}타점
                </div>
            </div>
            <v-divider></v-divider>
            <div>
                <span class="font-weight-bold">{{ currentPitcher?.replaced_position??currentPitcher?.position }} : {{ currentPitcher.replaced_player_name??currentPitcher.player_name }}</span>
                <div>
                    투구수: {{ isAway?gameCurrentInfo.home_pitch_count:gameCurrentInfo.away_pitch_count }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { commonFetch } from '@/utils/common/commonFetch';

const props = defineProps({
    gamedayInfo: Object,
    currentInning: Number,
    gameCurrentInfo: Object,
    lineupList : Object,
    currentBatter : Object,
    currentPitcher : Object,
})

const gamedayInfo = computed(()=>props.gamedayInfo);
const lineupList = computed(()=>props.lineupList)
const gameCurrentInfo = computed(()=>props.gameCurrentInfo)
const isAway = computed(()=>gameCurrentInfo.value.inning_half === 'top');
const currentBatter = computed(()=>props.currentBatter)
const currentPitcher = computed(()=>props.currentPitcher)
const currentBatterStats = ref({});

const defenders = ref([
    { name: '1루수', position: '1B', x: 342, y: 300 },
    { name: '2루수', position: '2B', x: 320, y: 225 },
    { name: '유격수', position: 'SS', x: 180, y: 225 },
    { name: '3루수', position: '3B', x: 148, y: 300 },
    { name: '좌익수', position: 'LF', x: 90, y: 140 },
    { name: '중견수', position: 'CF', x: 250, y: 70 },
    { name: '우익수', position: 'RF', x: 420, y: 140 },
    { name: '포수', position: 'C', x: 250, y: 470 },
]);

const pitcher = ref({ name: '투수', position: 'P', x: 250, y: 343 });
const runner_1b = ref({ name: '1루주자', position: '1R', x: 342, y: 340 });
const runner_2b = ref({ name: '2루주자', position: '2R', x: 250, y: 250 });
const runner_3b = ref({ name: '3루주자', position: '3R', x: 148, y: 340 });
const batter = ref({ name: '타자', position: 'B', x: 300, y: 435 });

const getPlayerPosition = (player, defenseYn=true) => ({
    position: 'absolute',
    left: `${(player.x / 500) * 100}%`,
    top: `${(player.y / 500) * 100}%`,
    backgroundColor: defenseYn?'#333':'#fff',
    color: defenseYn?'#fff':'#333',
    borderRadius: '5px',
    padding: '2px 5px',
    fontSize: '12px',
    transform: 'translate(-50%, -50%)'
});

const currentDefenders = computed(() => {
    const side = isAway.value ? 'home' : 'away';

    const latestNine = lineupList.value
        .map(order => order[side]?.at(-1))
        .filter(Boolean)
        .reverse(); // 최신 선수 우선

    const defenderMap = new Map();

    for (const player of latestNine) {
        const position = (player.replaced_position ?? player.position)?.toUpperCase();
        if (!defenderMap.has(position)) {
            defenderMap.set(position, player);
        }
    }

    return defenderMap;
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