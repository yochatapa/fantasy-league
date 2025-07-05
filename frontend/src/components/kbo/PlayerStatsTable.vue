<template>
    <v-col :cols="cols" :md="md" v-if="matchup.status !== 'scheduled'">
        <v-card>
            <v-card-title>
                <div class="d-flex">
                    <img :src="isHome?matchup.home_team_path:matchup.away_team_path" alt="Team Logo" class="team-logo" style="height:2rem" />
                    {{ isHome?matchup.home_team_name:matchup.away_team_name }}
                </div>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
                <v-col cols="12">
                    <span class="text-h6">타자 스탯</span>
                </v-col>
                <v-data-table
                    :headers="batterHeaders"
                    :items="batters"
                    class="mb-6 no-cell-padding"
                    hide-default-footer
                    :items-per-page="-1"
                    disable-sort
                >
                    <template #item.player_name="{ item }">
                        <div class="d-flex" style="white-space: nowrap;padding-right: 10px;">
                            <div class="d-flex justify-center" style="width: 28px;">
                                <v-icon v-if="item.replaced_by" color="primary">mdi-swap-horizontal</v-icon>
                                <span v-else>{{ item.batting_order }}</span>
                            </div>
                            {{ item.player_name }}
                        </div>
                    </template>
                </v-data-table>

                <v-col cols="12">
                    <span class="text-h6">투수 스탯</span>
                </v-col>
                <v-data-table
                    :headers="pitcherHeaders"
                    :items="pitchers"
                    class="mb-12 no-cell-padding"
                    hide-default-footer
                    :items-per-page="-1"
                    disable-sort
                >
                    <template #item.player_name="{ item }">
                        <div class="d-flex align-center" style="white-space: nowrap;padding-right: 10px;">
                            {{ item.player_name }}
                            <v-chip v-if="item.wins > 0" color="primary" class="ma-1" size="small" variant="elevated">승</v-chip>
                            <v-chip v-else-if="item.losses > 0" color="error" class="ma-1" size="small" variant="elevated">패</v-chip>
                            <v-chip v-else-if="item.saves > 0" color="green" class="ma-1" size="small" variant="elevated">세</v-chip>
                            <v-chip v-else-if="item.holds > 0" color="gray" class="ma-1" size="small" variant="elevated">홀</v-chip>
                            <v-chip v-else-if="item.blown_saves > 0" color="brown" class="ma-1" size="small" variant="elevated">블</v-chip>
                        </div>
                    </template>
                    <template #item.outs_pitched_display="{ item }">
                        {{ getOutsPitchedDisplay(item, isHome) }}
                    </template>
                    <template #item.batters_faced="{ item }">
                        {{ getBattersFaced(item, isHome) }}
                    </template>
                    <template #item.pitches_thrown="{ item }">
                        {{ getPitchesThrown(item, isHome) }}
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
    </v-col>
</template>

<script setup>
const props = defineProps({
    matchup: Object,
    batters: Array,
    pitchers: Array,
    isHome: Boolean,
    gameCurrentInfo: Object,
    lineupList: Array,
    getPlayerId: Function,
    cols : Number,
    md : Number,
})

const getInningDisplayInfo = (outsPitched) => {
    const totalOuts = Number(outsPitched) || 0;

    const fullInnings = Math.floor(totalOuts / 3);
    const remainder = totalOuts % 3;

    const fraction = remainder === 1 ? '⅓' : remainder === 2 ? '⅔' : '';

    return `${fullInnings} ${fraction}`.trim();
}

// 전체 타자 스탯 필드
const batterHeaders = [
    { title: '이름', key: 'player_name', fixed: true, align: 'center' },
    { title: '타석', key: 'plate_appearances', nowrap: true, align: 'center' },
    { title: '타수', key: 'at_bats', nowrap: true, align: 'center' },
    { title: '안타', key: 'hits', nowrap: true, align: 'center' },
    { title: '1루타', key: 'singles', nowrap: true, align: 'center' },
    { title: '2루타', key: 'doubles', nowrap: true, align: 'center' },
    { title: '3루타', key: 'triples', nowrap: true, align: 'center' },
    { title: '홈런', key: 'home_runs', nowrap: true, align: 'center' },
    { title: '타점', key: 'rbi', nowrap: true, align: 'center' },
    { title: '득점', key: 'runs', nowrap: true, align: 'center' },
    { title: '볼넷', key: 'walks', nowrap: true, align: 'center' },
    { title: '고의사구', key: 'intentional_base_on_balls', nowrap: true, align: 'center' },
    { title: '삼진', key: 'batter_strikeouts', nowrap: true, align: 'center' },
    { title: '사구', key: 'hit_by_pitch', nowrap: true, align: 'center' },
    { title: '희생번트', key: 'sacrifice_bunts', nowrap: true, align: 'center' },
    { title: '희생플라이', key: 'sacrifice_flies', nowrap: true, align: 'center' },
    { title: '도루', key: 'stolen_bases', nowrap: true, align: 'center' },
    { title: '도루실패', key: 'caught_stealings', nowrap: true, align: 'center' },
    { title: '실책', key: 'batter_errors', nowrap: true, align: 'center' }
];

// 전체 투수 스탯 필드
const pitcherHeaders = [
    { title: '이름', key: 'player_name', fixed: true,},
    { title: '이닝', key: 'outs_pitched_display', nowrap: true, align: 'center' },
    // { title: '아웃수', key: 'outs_pitched', nowrap: true, align: 'center' },
    { title: '상대타자', key: 'batters_faced', nowrap: true, align: 'center' },
    { title: '투구수', key: 'pitches_thrown', nowrap: true, align: 'center' },
    { title: '피안타', key: 'hits_allowed', nowrap: true, align: 'center' },
    { title: '피홈런', key: 'home_runs_allowed', nowrap: true, align: 'center' },
    { title: '실점', key: 'runs_allowed', nowrap: true, align: 'center' },
    { title: '자책점', key: 'earned_runs', nowrap: true, align: 'center' },
    { title: '볼넷허용', key: 'walks_allowed', nowrap: true, align: 'center' },
    { title: '탈삼진', key: 'pitcher_strikeouts', nowrap: true, align: 'center' },
    { title: '폭투', key: 'wild_pitches', nowrap: true, align: 'center' },
    { title: '승', key: 'wins', nowrap: true, align: 'center' },
    { title: '패', key: 'losses', nowrap: true, align: 'center' },
    { title: '세이브', key: 'saves', nowrap: true, align: 'center' },
    { title: '홀드', key: 'holds', nowrap: true, align: 'center' },
    { title: '블론', key: 'blown_saves', nowrap: true, align: 'center' }
];

function getOutsPitchedDisplay(item, isHome) {
    const lastPitcher = props.getPlayerId(props.lineupList[0][isHome ? 'home' : 'away'].at(-1));
    const suspendedPitcherId = isHome
        ? props.matchup.home_suspended_pitcher_id
        : props.matchup.away_suspended_pitcher_id;
    const currentOut = isHome
        ? props.gameCurrentInfo.home_current_out
        : props.gameCurrentInfo.away_current_out;
    const suspendedOut = isHome
        ? props.matchup.home_current_out
        : props.matchup.away_current_out;

    return item.player_id === lastPitcher
        ? getInningDisplayInfo(currentOut - (item.player_id !== suspendedPitcherId ? 0 : suspendedOut))
        : item.outs_pitched_display;
}

function getBattersFaced(item, isHome) {
    const lastPitcher = props.getPlayerId(props.lineupList[0][isHome ? 'home' : 'away'].at(-1));
    const suspendedPitcherId = isHome
        ? props.matchup.home_suspended_pitcher_id
        : props.matchup.away_suspended_pitcher_id;
    const currentNumber = isHome
        ? props.gameCurrentInfo.away_current_batting_number
        : props.gameCurrentInfo.home_current_batting_number;
    const suspendedNumber = isHome
        ? props.matchup.away_current_batting_number
        : props.matchup.home_current_batting_number;

    return item.player_id === lastPitcher
        ? currentNumber - (item.player_id !== suspendedPitcherId ? 0 : suspendedNumber)
        : item.batters_faced;
}

function getPitchesThrown(item, isHome) {
    const lastPitcher = props.getPlayerId(props.lineupList[0][isHome ? 'home' : 'away'].at(-1));
    const suspendedPitcherId = isHome
        ? props.matchup.home_suspended_pitcher_id
        : props.matchup.away_suspended_pitcher_id;
    const currentPitch = isHome
        ? props.gameCurrentInfo.home_pitch_count
        : props.gameCurrentInfo.away_pitch_count;
    const suspendedPitch = isHome
        ? props.matchup.home_pitch_count
        : props.matchup.away_pitch_count;

    return item.player_id === lastPitcher
        ? currentPitch - (item.player_id !== suspendedPitcherId ? 0 : suspendedPitch)
        : item.pitches_thrown;
}
</script>
