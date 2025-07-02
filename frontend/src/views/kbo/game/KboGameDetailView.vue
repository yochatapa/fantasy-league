<template>
    <!-- 상단 달력 -->
    <v-row class="mb-4" v-if="selectedMatchup">
        <v-col cols="12" class="d-flex justify-space-between align-center">
            <span class="text-h6 font-weight-bold">KBO 경기 정보</span>
        </v-col>
    </v-row>
    
    <!-- 경기 목록과 경기 정보 -->
    <v-row align="stretch">
        <v-col cols="12" v-if="selectedMatchup">
            <v-row align="stretch" class="h-100">
                <v-col cols="12">
                    <v-card class="h-100">
                        <v-card-title>경기 정보</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <div v-if="selectedMatchup">
                                <div class="d-flex justify-center align-center"> 
                                    <p class="text-h6"><strong>{{ GAME_STATUS[selectedMatchup.status] }}</strong> </p>
                                </div>
                                <div class="game-header d-flex justify-space-between align-center mb-3">
                                    <div class="d-flex justify-center align-center w-100 flex-column">
                                        <img :src="selectedMatchup.away_team_path" alt="Away Team Logo" class="team-logo mb-1" />
                                        <span :class="[
                                            'font-weight-bold',
                                            'team-name',
                                            'text-center',
                                            { 'text-h6': !isMobile }
                                        ]">{{ selectedMatchup.away_team_name }}</span>    
                                    </div>
                                    <div class="d-flex justify-center align-center">
                                        <span :class="[
                                            isMobile ? 'text-h5' : 'text-h4',
                                            'font-weight-bold'
                                        ]">{{ gameCurrentInfo.away_score }}</span>
                                        <span :class="[
                                            isMobile ? 'text-h5' : 'text-h4',
                                            'font-weight-bold',
                                            'mx-2',
                                            'vs'
                                        ]">:</span>
                                        <span :class="[
                                            isMobile ? 'text-h5' : 'text-h4',
                                            'font-weight-bold'
                                        ]">{{ gameCurrentInfo.home_score }}</span>
                                    </div>
                                    <div class="d-flex justify-center align-center w-100 flex-column">
                                        <img :src="selectedMatchup.home_team_path" alt="Home Team Logo" class="team-logo mb-1" />
                                        <span :class="[
                                            'font-weight-bold',
                                            'team-name',
                                            'text-center',
                                            { 'text-h6': !isMobile }
                                        ]">{{ selectedMatchup.home_team_name }}</span>
                                    </div>
                                </div>
                                <div class="d-flex justify-center flex-column align-center mb-3">
                                    <p class="mb-1"><strong>경기장:</strong> {{ STADIUMS.find(sdm => sdm.code === selectedMatchup.stadium)?.name??'' }}</p>
                                    <p><strong>경기일시:</strong> {{ selectedMatchup.game_date }} {{ selectedMatchup.game_time }}</p>
                                </div>
                                <div>
                                    <v-table class="no-cell-padding">
                                        <thead>
                                            <tr>
                                                <th class="text-center" :style="{ width : isMobile?'':'150px' }">팀</th>
                                                <th
                                                    class="text-center"
                                                    v-for="inning in Math.max(inningStats.maxInning || 9, 9)"
                                                    :key="'inning-' + inning"
                                                >
                                                    {{ inning }}
                                                </th>
                                                <th
                                                    class="text-center"
                                                    v-for="label in ['R', 'H', 'E', 'B']"
                                                    :key="'label-' + label"
                                                >
                                                    {{ label }}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <!-- Away team row -->
                                            <tr>
                                                <td>
                                                    <div class="d-flex align-center justify-center">
                                                        <img
                                                            :src="selectedMatchup.away_team_path"
                                                            alt="Away Team Logo"
                                                            class="team-logo"
                                                            style="height:2rem"
                                                            
                                                        />
                                                        <span class="font-weight-bold team-name text-center" v-if="!isMobile">
                                                            {{ selectedMatchup.away_team_name }}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td
                                                    class="text-center"
                                                    v-for="(inning, index) in Math.max(inningStats.maxInning || 9, 9)"
                                                    :key="'away-inning-' + index"
                                                >
                                                    {{ inningStats.away?.[index]?.runs ?? (index<gameCurrentInfo.inning && selectedMatchup.status !== 'scheduled'?'0':'') }}
                                                </td>
                                                <td class="text-center">{{ inningStats.summary?.away?.R }}</td>
                                                <td class="text-center">{{ inningStats.summary?.away?.H }}</td>
                                                <td class="text-center">{{ inningStats.summary?.away?.E }}</td>
                                                <td class="text-center">{{ inningStats.summary?.away?.B }}</td>
                                            </tr>

                                            <!-- Home team row -->
                                            <tr>
                                                <td>
                                                    <div class="d-flex align-center justify-center">
                                                        <img
                                                            :src="selectedMatchup.home_team_path"
                                                            alt="Home Team Logo"
                                                            class="team-logo"
                                                            style="height:2rem"
                                                            
                                                        />
                                                        <span class="font-weight-bold team-name text-center" v-if="!isMobile">
                                                            {{ selectedMatchup.home_team_name }}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td
                                                    class="text-center"
                                                    v-for="(inning, index) in Math.max(inningStats.maxInning || 9, 9)"
                                                    :key="'home-inning-' + index"
                                                >   
                                                    {{ inningStats.home?.[index]?.runs ?? ((index==gameCurrentInfo.inning-1 && gameCurrentInfo.inning_half === 'bottom') || index<gameCurrentInfo.inning-1?'0':'') }}
                                                </td>
                                                <td class="text-center">{{ inningStats.summary?.home?.R }}</td>
                                                <td class="text-center">{{ inningStats.summary?.home?.H }}</td>
                                                <td class="text-center">{{ inningStats.summary?.home?.E }}</td>
                                                <td class="text-center">{{ inningStats.summary?.home?.B }}</td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" md="6" v-if="lineupYn && selectedMatchup.status !== 'scheduled'">
                    <v-card class="h-100">
                        <v-card-title>경기 중계</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <baseball-stadium 
                                :gameday-info="gamedayInfo" 
                                :current-inning="currentInning" 
                                :game-current-info="gameCurrentInfo"
                                :lineup-list="lineupList"
                                :current-batter="currentBatter"
                                :current-pitcher="currentPitcher"
                            />
                            <div class="chip-container mt-2">
                                <div class="d-flex" style="gap: 4px; overflow-x: auto; white-space: nowrap;">
                                    <v-chip
                                        v-for="number in gameCurrentInfo.inning>9?gameCurrentInfo.inning:9"
                                        :key="number"
                                        class="d-flex justify-center align-center cursor-pointer"
                                        size="small"
                                        :variant="number === currentInning ? 'tonal' : 'text'"
                                        @click="setCurrentInning(number)"
                                        :disabled="number>gameCurrentInfo.inning"
                                    >
                                        {{ number }}회
                                    </v-chip>
                                </div>

                                <!-- 아래의 내용 영역 -->
                                <v-card class="content-card mt-3" elevation="2">
                                    <div class="content-wrapper" ref="contentCard">
                                        <div v-for="(inningInfo, topBottom) in gamedayInfo[currentInning]" class="w-100">
                                            <div>
                                                <v-divider></v-divider>
                                                <br>
                                                <span>{{currentInning}}회 {{ topBottom==='top'?"초":"말" }}</span>
                                            </div>
                                            <div v-for="(outInfo, outcount) in inningInfo">
                                                <div>
                                                    <br>
                                                    <v-divider></v-divider>
                                                    <br>
                                                    <span>{{ outInfo?.at(-1)?.batter?.batting_order }}번 타자 : {{ getPlayerName(outInfo?.at(-1)?.batter) }}</span>
                                                    <br>
                                                    <span>
                                                        {{ outInfo?.at(-1)?.batter?.stats?.plate_appearances }}타석 {{ outInfo?.at(-1)?.batter?.stats?.at_bats }}타수 {{ outInfo?.at(-1)?.batter?.stats?.hits }}안타 {{ outInfo?.at(-1)?.batter?.stats?.walks }}볼넷 {{ outInfo?.at(-1)?.batter?.stats?.strikeouts }}삼진
                                                    </span>
                                                    <br>
                                                    <span v-if="outInfo?.at(-1)?.batter?.stats?.hits>0">(1루타 {{ outInfo?.at(-1)?.batter?.stats?.singles }}, 2루타 {{ outInfo?.at(-1)?.batter?.stats?.doubles }}, 3루타 {{ outInfo?.at(-1)?.batter?.stats?.triples }}, 홈런 {{ outInfo?.at(-1)?.batter?.stats?.home_runs }})</span>
                                                    <br v-if="outInfo?.at(-1)?.batter?.stats?.hits>0">
                                                    <span>
                                                        {{ outInfo?.at(-1)?.batter?.stats?.rbis }}타점 {{ outInfo?.at(-1)?.batter?.stats?.runs }}득점 {{ outInfo?.at(-1)?.batter?.stats?.stolen_bases }}도루
                                                    </span>
                                                    <br>
                                                    <br>
                                                    <span>투수 : {{ getPlayerName(outInfo?.at(-1)?.pitcher) }}</span>
                                                </div>
                                                <br>
                                                <div v-for="(ballInfo, index) in outInfo">
                                                    <div v-if="ballInfo.type === 'gameEnd'">
                                                        경기 종료
                                                        <br>
                                                        {{ selectedMatchup.away_team_name }} : {{ gameCurrentInfo.away_score }}점
                                                        <br>
                                                        {{ selectedMatchup.home_team_name }} : {{ gameCurrentInfo.home_score }}점
                                                    </div>
                                                    
                                                    <div v-if="ballInfo.type.startsWith('changePitcher')">
                                                        투수 교체 ({{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'home' : 'away'])?.find(pitcher => {return getPlayerId(pitcher)?.toString() === ballInfo.type.split(':')[1]})) }} ▶ {{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'home' : 'away'])?.find(pitcher => {return getPlayerId(pitcher)?.toString() === ballInfo.type.split(':')[2]})) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('changeBatter')">
                                                        타자 교체 ({{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'away' : 'home'])?.find(batter => {return getPlayerId(batter)?.toString() === ballInfo.type.split(':')[1]})) }} ▶ {{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'away' : 'home'])?.find(batter => {return getPlayerId(batter)?.toString() === ballInfo.type.split(':')[2]})) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('changeRunner')">
                                                        {{ ballInfo.type.split(':')[1] }}루 주자 교체 ({{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'away' : 'home'])?.find(batter => {return getPlayerId(batter)?.toString() === ballInfo.type.split(':')[2]})) }} ▶ {{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'away' : 'home'])?.find(batter => {return getPlayerId(batter)?.toString() === ballInfo.type.split(':')[3]})) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('changePlayer')">
                                                        선수 교체 ({{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'away' : 'home'])?.find(batter => {return getPlayerId(batter)?.toString() === ballInfo.type.split(':')[1]})) }} ▶ {{ getPlayerName(lineupList.flatMap(inning => inning[isAway ? 'away' : 'home'])?.find(batter => {return getPlayerId(batter)?.toString() === ballInfo.type.split(':')[2]})) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('changeDefense')">
                                                        수비 교체 ({{ ballInfo.type.split(':')[1] }} {{ lineupList.flatMap(inning => inning[isAway ? 'home' : 'away'])?.filter(batter => batter.player_id?.toString() === ballInfo.type.split(':')[2])?.at(-1)?.player_name }} ▶ {{ ballInfo.type.split(':')[3] }} {{ lineupList.flatMap(inning => inning[isAway ? 'home' : 'away'])?.filter(batter => batter.replaced_by?.toString() === ballInfo.type.split(':')[4])?.at(-1)?.replaced_player_name }})
                                                    </div>
                                                    
                                                    <div v-if="['flyout','groundout','linedrive','doubleplay','tripleplay','hitting','sacrificeFly','sacrificeBunt'].includes(ballInfo.type)">
                                                        {{ (ballInfo[topBottom==='top'?'home_current_pitch_count':'away_current_pitch_count'])+1 }}구 : 타격
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('pitchclock')" class="text-error">
                                                        {{ ballInfo.type === "pitchclockStrike"?'타자':'투수' }} 피치클락 위반 
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('wildPitch')" class="text-error">
                                                        투수 폭투
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('passedBall')" class="text-error">
                                                        포일
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('balk')" class="text-error">
                                                        투수 보크
                                                    </div>

                                                    <div v-if="['strike','ball','foul','swingAndMiss'].includes(ballInfo.type)">
                                                        {{ (ballInfo[topBottom==='top'?'home_current_pitch_count':'away_current_pitch_count'])+1 }}구 : {{ ballInfo.type==='strike'?'스트라이크':(ballInfo.type==='ball'?'볼':(ballInfo.type==='foul'?'파울':(ballInfo.type==='swingAndMiss'?'헛스윙':''))) }} <span class="text-grey-lighten-1">| {{ ballInfo.ball + (ballInfo.type==="ball"?1:0)}} - {{ ballInfo.strike + (["strike","swingAndMiss"].includes(ballInfo.type)?1:0) + (ballInfo.type === "foul" && ballInfo.strike<2 ? 1 : 0)}}</span>
                                                    </div>
                                                    <div v-else-if="['strikeout'].includes(ballInfo.type)" class="text-error">
                                                        스트라이크 아웃
                                                    </div>
                                                    <div v-else-if="['flyout'].includes(ballInfo.type)" class="text-error">
                                                        플라이 아웃
                                                    </div>
                                                    <div v-else-if="['groundout'].includes(ballInfo.type)" class="text-error">
                                                        땅볼 아웃
                                                    </div>
                                                    <div v-else-if="['linedrive'].includes(ballInfo.type)" class="text-error">
                                                        직선타
                                                    </div>
                                                    <div v-else-if="['baseonballs'].includes(ballInfo.type)" class="text-green">
                                                        볼넷
                                                    </div>
                                                    <div v-else-if="['hitByPitch'].includes(ballInfo.type)" class="text-green">
                                                        사구
                                                    </div>
                                                    <div v-else-if="['intentionalBaseOnBalls'].includes(ballInfo.type)" class="text-green">
                                                        고의사구
                                                    </div>
                                                    <div v-else-if="['fieldersChoice'].includes(ballInfo.type)" class="text-primary">
                                                        타자 주자 야수선택으로 출루
                                                    </div>
                                                    <div v-else-if="['groundOutReached'].includes(ballInfo.type)" class="text-primary">
                                                        티자 주자 땅볼로 출루
                                                    </div>
                                                    <div v-else-if="['doubleplay'].includes(ballInfo.type)" class="text-error">
                                                        병살타
                                                    </div>
                                                    <div v-else-if="['tripleplay'].includes(ballInfo.type)" class="text-error">
                                                        삼중살
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('out')" class="text-error">
                                                        {{ ballInfo.type.split(':')[1] === '0'
                                                            ? '타자 주자 아웃'
                                                            : ballInfo.type.split(':')[1] + '루 주자 아웃' }}
                                                        (
                                                        {{ ballInfo.type.split(':')[1] === '0'
                                                            ? getPlayerName(ballInfo?.batter)
                                                            : getPlayerName(ballInfo?.['runner_' + ballInfo.type.split(':')[1] + 'b']) }}
                                                        )
                                                    </div>
                                                    <div v-else-if="['hit'].includes(ballInfo.type)" class="text-primary">
                                                        안타 ({{ getPlayerName(outInfo?.at(-1)?.batter) }})
                                                    </div>
                                                    <div v-else-if="['double'].includes(ballInfo.type)" class="text-primary">
                                                        2루타 ({{ getPlayerName(outInfo?.at(-1)?.batter) }})
                                                    </div>
                                                    <div v-else-if="['triple'].includes(ballInfo.type)" class="text-primary">
                                                        3루타 ({{ getPlayerName(outInfo?.at(-1)?.batter) }})
                                                    </div>
                                                    <div v-else-if="['homerun'].includes(ballInfo.type)" class="text-primary">
                                                        홈런 ({{ getPlayerName(outInfo?.at(-1)?.batter) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('runner')">
                                                        {{ ballInfo.type.split(':')[1]==='0'?'타자주자':ballInfo.type.split(':')[1]+'루' }} -> {{ ballInfo.type.split(':')[2]==='4'?"홈":ballInfo.type.split(':')[2]+'루' }} 진루 ({{ ballInfo.type.split(':')[1] === '0'?(ballInfo?.batter?.replaced_player_name??ballInfo?.batter?.player_name) :(ballInfo?.['runner_'+ballInfo.type.split(':')[1]+'b']?.replaced_player_name??ballInfo?.['runner_'+ballInfo.type.split(':')[1]+'b']?.player_name) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('score')" class="text-primary">
                                                        {{ ballInfo.type.split(':')[1] === "4" ? getPlayerName(outInfo?.at(-1)?.batter) : getPlayerName(ballInfo['runner_'+ballInfo.type.split(':')[1]+'b']) }} 득점
                                                    </div>
                                                    <div v-else-if="['rbi'].includes(ballInfo.type)">
                                                        {{ getPlayerName(ballInfo?.batter) }} 타점
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('stolenBase')">
                                                        {{ ballInfo.type.split(':')[1] === "4"?"홈":ballInfo.type.split(':')[1]+"루"}} 도루 ({{ getPlayerName(ballInfo['runner_'+(Number(ballInfo.type.split(':')[1])-1)+'b']) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('caughtStealing')" class="text-error">
                                                        {{ ballInfo.type.split(':')[1] === "4"?"홈":ballInfo.type.split(':')[1]+"루"}} 도루 실패 ({{ getPlayerName(ballInfo['runner_'+(Number(ballInfo.type.split(':')[1])-1)+'b']) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('pickoff')" class="text-error">
                                                        {{ ballInfo.type.split(':')[1] === "4"?"홈":ballInfo.type.split(':')[1]+"루"}} 주자 견제사 ({{ getPlayerName(ballInfo['runner_'+ballInfo.type.split(':')[1]+'b']) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('sacrificeFly')" class="text-secondary">
                                                        희생플라이 ({{ getPlayerName(outInfo?.at(-1)?.batter) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('sacrificeBunt')" class="text-secondary">
                                                        희생번트 ({{ getPlayerName(outInfo?.at(-1)?.batter) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('error')" class="text-secondary">
                                                        {{ POSITIONS.filter(position => position.code === ballInfo.type.split(':')[1])?.[0]?.name??'' }} 실책
                                                    </div>
                                                </div>
                                            </div>
                                            <br>
                                        </div>
                                    </div>
                                </v-card>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" :md="selectedMatchup.status === 'scheduled'?12:6" v-if="lineupYn && lineupList.filter(ll => ll.away.length > 0 && ll.home.length >0).length === 10">
                    <v-card class="h-100">
                        <v-card-title>라인업</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <v-row class="text-center font-bold">
                                <v-col>원정팀</v-col>
                                <span class="py-3">타순</span>
                                <v-col>홈팀</v-col>
                            </v-row>
                            <v-row
                                v-for="(lineup, index) in lineupList"
                                :key="index"
                                class="d-flex align-center text-center"
                            >
                                <v-divider></v-divider>
                                <v-col
                                    class="d-flex flex-column"
                                    :class="{ 'selected-lineup': selectedLineup[0] === 'away' && selectedLineup[1] === index }"
                                >
                                    <div
                                        v-for="(player, aIdx) in groupPlayers(lineupList[((index + 1) % 10)]?.away || [])"
                                        :key="aIdx"
                                        class="d-flex justify-space-between"
                                    >
                                        <span class="w-100">
                                            ({{ player.positions.join(',') }}) {{ player.name }}
                                        </span>
                                    </div>
                                </v-col>

                                <span class="pa-3">
                                    {{ ((index + 1) % 10) === 0 ? "투수" : ((index + 1) % 10) + "번" }}
                                </span>

                                <v-col
                                    class="d-flex flex-column"
                                    :class="{ 'selected-lineup': selectedLineup[0] === 'home' && selectedLineup[1] === index }"
                                >
                                    <div
                                        v-for="(player, hIdx) in groupPlayers(lineupList[((index + 1) % 10)]?.home || [])"
                                        :key="hIdx"
                                        class="d-flex justify-space-between"
                                    >
                                        <span class="w-100">
                                            ({{ player.positions.join(',') }}) {{ player.name }}
                                        </span>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" v-if="selectedMatchup.status === 'completed'">
                    <v-card>
                        <v-card-title>선수 기록</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <h2>홈 팀</h2>
                            <v-col cols="12">
                                <span class="text-h6">타자 스탯</span>
                            </v-col>
                            <v-data-table
                                :headers="batterHeaders"
                                :items="homeBatters"
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
                                :items="homePitchers"
                                class="mb-12 no-cell-padding"
                                hide-default-footer
                                :items-per-page="-1"
                                disable-sort
                            >
                                <template #item.player_name="{ item }">
                                    <div class="d-flex align-center" style="white-space: nowrap;padding-right: 10px;">
                                        {{ item.player_name }}
                                        <v-chip
                                            v-if="item.wins > 0"
                                            color="primary"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            승
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.losses > 0"
                                            color="error"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            패
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.saves > 0"
                                            color="green"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            세
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.holds > 0"
                                            color="gray"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            홀
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.blown_saves > 0"
                                            color="brown"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            블
                                        </v-chip>
                                    </div>
                                </template>
                            </v-data-table>
                            <v-divider class="mb-8"></v-divider>
                            <h2>원정팀</h2>
                            <v-col cols="12">
                                <span class="text-h6">타자 스탯</span>
                            </v-col>
                            <v-data-table
                                :headers="batterHeaders"
                                :items="awayBatters"
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
                                :items="awayPitchers"
                                class="no-cell-padding"
                                hide-default-footer
                                :items-per-page="-1"
                                disable-sort
                            >
                                <template #item.player_name="{ item }">
                                    <div class="d-flex align-center" style="white-space: nowrap;padding-right: 10px;">
                                        {{ item.player_name }}
                                        <v-chip
                                            v-if="item.wins > 0"
                                            color="primary"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            승
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.losses > 0"
                                            color="error"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            패
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.saves > 0"
                                            color="green"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            세
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.holds > 0"
                                            color="gray"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            홀
                                        </v-chip>
                                        <v-chip
                                            v-else-if="item.blown_saves > 0"
                                            color="brown"
                                            class="ma-1"
                                            size="small"
                                            variant="elevated"
                                            style="border-radius: 50%; width: 20px; height: 20px; padding: 0; justify-content: center;"
                                        >
                                            블
                                        </v-chip>
                                    </div>
                                </template>
                            </v-data-table>
                        </v-card-text>
                        
                    </v-card>
                </v-col>
            </v-row>
        </v-col>
    </v-row>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { STADIUMS, POSITIONS, GAME_STATUS } from '@/utils/code/code.js';
import { commonFetch, getNewFormData } from '@/utils/common/commonFetch';
import { formatDate } from '@/utils/common/dateUtils.js';
import { encryptData, decryptData } from '@/utils/common/crypto.js';
import BaseballStadium from '@/components/kbo/BaseballStadium.vue';
import { useRouter, useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';

const router = useRouter();
const route = useRoute();
const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);

const props = defineProps({
    encryptedGameId: String
});

const orgGameId = props.encryptedGameId;
let gameId = null;

try {
    gameId = decryptData(decodeURIComponent(orgGameId));
} catch (error) {
    console.error(error)
    alert("올바르지 않은 경로입니다.");
    router.push("/");
}

const selectedDate = ref(route.query.date?new Date(route.query.date):new Date());
const formattedDate = ref(route.query.date??formatDate(selectedDate.value));
const calendarOpen = ref(false);
const isExpanded = ref(true);

const toggleExpand = () => {
    isExpanded.value = !isExpanded.value;
};
const selectedMatchup = ref(null);
const selectedLineup = ref([null,null])

const runner_1b = ref(1);
const runner_2b = ref(1);
const runner_3b = ref(1);

const errorPlayer = ref(null);

const teamList = ref([]);
const gameList = ref([]);
const lineupList = ref(new Array(10).fill(null).map(() => ({ away: [], home: [] })))
const awayTeamInfo = ref([]);
const homeTeamInfo = ref([]);
const awayTeamRosterInfo = ref([]);
const homeTeamRosterInfo = ref([]);
const activeRoster = ref([])

const selectedAwayTeam = ref(null);
const selectedHomeTeam = ref(null);
const stadium = ref(null);
const gameTime = ref('18:30');
const gameType = ref('normal');

const tomorrow = ref(new Date(new Date(formattedDate.value.replace(/\./g, '-')).getTime() + 86400000).toISOString().split('T')[0].split('-').join('.'));

const suspendedStadium = ref(null)
const suspendedGameDate = ref(tomorrow.value)
const suspendedGameTime = ref('18:30')

const lineupYn = computed(()=>lineupList.value.filter(ll => ll.away.length > 0 && ll.home.length >0).length=== 10);

const canAddMatchup = computed(() => {
    return (
        selectedAwayTeam.value &&
        selectedHomeTeam.value &&
        stadium.value &&
        gameTime.value &&
        gameType.value &&
        selectedAwayTeam.value !== selectedHomeTeam.value
    );
});

const canAddSuspendedMatchup = computed(()=>{
    return (
        suspendedStadium.value &&
        suspendedGameDate.value &&
        suspendedGameTime.value
    );
})

const inningStats = ref({
    home: [],
    away: [],
    summary: {
        home: { R: 0, H: 0, E: 0, B: 0 },
        away: { R: 0, H: 0, E: 0, B: 0 }
    },
    maxInning: 9
});

const contentCard = ref(null);

const currentInning = ref(1);

const lineupTeam = ref(null);
const isReplace = ref(false);

const lineup = ref({
    team_id: null,
    player_id: null,
    replaced_by: null,
    batting_order: null,
    replaced_position : null,
    position : null,
});

const winning_pitcher = ref(null);
const losing_pitcher = ref(null);
const save_pitcher = ref(null);
const hold_pitcher = ref(null);
const blown_save_pitcher = ref(null);

const winning_pitcher_yn = ref(true);
const losing_pitcher_yn = ref(true);
const save_pitcher_yn = ref(true);
const hold_pitcher_yn = ref(true);
const blown_save_pitcher_yn = ref(true);

const fullPlayerStats = ref([]);

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
    { title: '상대한 타자 수', key: 'batters_faced', nowrap: true, align: 'center' },
    { title: '투구 수', key: 'pitches_thrown', nowrap: true, align: 'center' },
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
    { title: '블론세이브', key: 'blown_saves', nowrap: true, align: 'center' }
];

// 필터링된 데이터
const homeBatters = computed(() =>
    fullPlayerStats.value.filter(p => p.player_type === 'B' && p.team_id === selectedMatchup.value.home_team_id)
);
const homePitchers = computed(() =>
    fullPlayerStats.value.filter(p => p.player_type === 'P' && p.team_id === selectedMatchup.value.home_team_id)
);
const awayBatters = computed(() =>
    fullPlayerStats.value.filter(p => p.player_type === 'B' && p.team_id === selectedMatchup.value.away_team_id)
);
const awayPitchers = computed(() =>
    fullPlayerStats.value.filter(p => p.player_type === 'P' && p.team_id === selectedMatchup.value.away_team_id)
);

const gamedayInfo = ref({});

const gameCurrentInfo = ref({
    inning : 1,
    inning_half : 'top',
    out : 0,
    strike : 0,
    ball : 0,
    away_current_out : 0,
    home_current_out : 0,
    away_pitch_count : 0,
    home_pitch_count : 0,
    away_current_pitch_count : 0,
    home_current_pitch_count : 0,
    away_batting_number : 0,
    away_current_batting_number : 0,
    home_batting_number : 0,
    home_current_batting_number : 0,
    away_score : 0,
    home_score : 0,
    runner_1b : null,
    runner_2b : null,
    runner_3b : null,
    is_available_stat : true
});

const gameStartInfo = ref({
    inning : 1,
    inning_half : 'top',
    out : 0,
    strike : 0,
    ball : 0,
    away_current_out : 0,
    home_current_out : 0,
    away_pitch_count : 0,
    home_pitch_count : 0,
    away_current_pitch_count : 0,
    home_current_pitch_count : 0,
    away_batting_number : 0,
    away_current_batting_number : 0,
    home_batting_number : 0,
    home_current_batting_number : 0,
    away_score : 0,
    home_score : 0,
    runner_1b : null,
    runner_2b : null,
    runner_3b : null,
    is_available_stat : true
});

const isAway = computed(()=>gameCurrentInfo.value.inning_half === 'top');

const currentBatter = computed(()=>{
    const awayHome = isAway.value?'away':'home';
    const battingOrderInfo = lineupList.value[(gameCurrentInfo.value[awayHome + '_batting_number'] % 9) + 1]?.[awayHome];
    const lastBatterInfo = battingOrderInfo?.[(battingOrderInfo?.length??1)-1]
    
    return lastBatterInfo??{
        team_id: null,
        player_id: null,
        replaced_by: null,
        batting_order: null,
        replaced_inning: null,
        position : null,
    }
})

const currentPitcher = computed(()=>{
    const awayHome = isAway.value?'home':'away';
    const pitcherOrderInfo = lineupList.value[0]?.[awayHome];
    const lastPitcherInfo = pitcherOrderInfo?.[(pitcherOrderInfo?.length??1)-1]
    return lastPitcherInfo??{
        team_id: null,
        player_id: null,
        replaced_by: null,
        batting_order: null,
        replaced_inning: null,
        position : null,
    }
})

const groupPlayers = (players) => {
    const grouped = new Map();

    players.forEach((player) => {
        const name = getPlayerName(player);
        const pos = getPlayerPosition(player);

        if (!grouped.has(name)) {
            grouped.set(name, {
                name,
                positions: [pos],
                roster_id: player.roster_id,
            });
        } else {
            const existing = grouped.get(name);
            if (!existing.positions.includes(pos)) {
                existing.positions.push(pos);
            }
        }
    });

    return Array.from(grouped.values());
};

const teams = ref([]);

watch(()=>selectedMatchup.value, (newVal) => {
    if(newVal)
        teams.value = [
            {
                id : newVal.away_team_id
                , name : newVal.away_team_name
            },
            {
                id : newVal.home_team_id
                , name : newVal.home_team_name
            }
        ]
    else teams.value = [];
})

watch(()=>selectedDate.value, (newVal)=>{
    formattedDate.value = formatDate(newVal)
    tomorrow.value = new Date(new Date(formattedDate.value.replace(/\./g, '-')).getTime() + 86400000).toISOString().split('T')[0].split('-').join('.')
    suspendedGameDate.value = tomorrow.value
})

watch(()=>selectedHomeTeam.value, newVal => {
    if(newVal) stadium.value = teamList.value.find(team=>team.id===newVal)?.main_stadium
})

watch(()=>lineup.value.team_id,(newVal) => {
    lineupTeam.value = !!!newVal?null:(selectedMatchup.value.away_team_id === newVal?"away":(selectedMatchup.value.home_team_id === newVal?"home":null))
    activeRoster.value = !!!lineupTeam.value?[]:(lineupTeam.value === "away"?awayTeamRosterInfo.value:homeTeamRosterInfo.value)

    const lineupPlayer = lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.[lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.length-1];
    if(lineupPlayer){
        lineup.value.player_id = getPlayerId(lineupPlayer)
        lineup.value.position = getPlayerPosition(lineupPlayer)
        isReplace.value = true;
    }
    else{
        lineup.value.player_id = null
        lineup.value.position = null
        isReplace.value = false;
    }
}) 

watch(()=>lineup.value.batting_order,(newVal)=>{
    const lineupPlayer = lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.[lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.length-1];
    if(lineupPlayer){
        lineup.value.player_id = getPlayerId(lineupPlayer)
        lineup.value.position = getPlayerPosition(lineupPlayer)
        isReplace.value = true;
    }
    else{
        lineup.value.player_id = null
        lineup.value.position = null
        isReplace.value = false;
    }
})

watch(()=>lineup.value.player_id,(newVal)=>{
    if(!lineup.value.position){
        lineup.value.position = activeRoster.value.find(ar=>ar.player_id === newVal)?.primary_position
    }
})

watch(()=>awayTeamInfo.value, (newVal)=>{
    newVal.forEach(val => {
        if(val.batting_order === null || val.batting_order === undefined) return;
        lineupList.value[val.batting_order]?.["away"].push(val)
    })
})

watch(()=>homeTeamInfo.value, (newVal)=>{
    newVal.forEach(val => {
        if(val.batting_order === null || val.batting_order === undefined) return;
        lineupList.value[val.batting_order]?.["home"].push(val)
    })
})

watch(gamedayInfo, () => {
    nextTick(() => {
        if (contentCard.value) {
            contentCard.value.scrollTop = contentCard.value.scrollHeight;
        }
    });
}, { deep: true });

watch(()=>currentBatter.value, async (newVal) => {
    if(!!newVal.game_id && !!getPlayerId(newVal)){
        const [currentInfoRes, inningInfoRes] = await Promise.all([
                commonFetch(`/api/admin/game/${newVal.game_id}/batter/${getPlayerId(newVal)}/current-stats`),
                commonFetch(`/api/admin/game/inning-info/${newVal.game_id}`)
            ]);

        if(currentInfoRes.success && currentInfoRes?.data?.currentBatterStats?.[0]){
            currentBatter.value.stats = currentInfoRes?.data?.currentBatterStats?.[0]
        }else currentBatter.value.stats = {};

        if(inningInfoRes.success && inningInfoRes?.data?.inningInfo){
            inningStats.value = inningInfoRes.data?.inningInfo
        }else inningStats.value = {
            home: [],
            away: [],
            summary: {
                home: { R: 0, H: 0, E: 0, B: 0 },
                away: { R: 0, H: 0, E: 0, B: 0 }
            },
            maxInning: 9
        }
    }
})

watch(
    () => [gameCurrentInfo.value.away_batting_number, gameCurrentInfo.value.home_batting_number],
    async () => {
        const info = gameCurrentInfo.value;
        const status = selectedMatchup.value?.status;

        if (
            status === 'playball' &&
            info.inning >= 9 &&
            info.inning_half === 'bottom' &&
            info.away_score < info.home_score
        ) {
            await setGameOver();
        }
    }
)

const updateGameStatus = async (status) => {
    const gameId = selectedMatchup.value.game_id;
    try {
        const response = await commonFetch(`/api/admin/game/status/update`,{
            method : "PUT",
            body : {
                gameId
                , status
            }
        })
        
        if(response.success){
            await getGameDetailInfo(gameId)
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

const updateGameSeasonStats = async () => {
    const gameId = selectedMatchup.value.game_id;
    try {
        const response = await commonFetch(`/api/admin/game/stats/update/season`,{
            method : "PUT",
            body : {
                gameId
            }
        })
    } catch (error) {
        
    }
}

const updateGameDailyStats = async () => {
    const gameId = selectedMatchup.value.game_id;
    try {
        const response = await commonFetch(`/api/admin/game/stats/update/daily`,{
            method : "PUT",
            body : {
                gameId
            }
        })
    } catch (error) {
        
    }
}

const updateGameScore = async () => {
    const gameId = selectedMatchup.value.game_id;
    try {
        const response = await commonFetch(`/api/admin/game/score/update`,{
            method : "PUT",
            body : {
                gameId,
                homeScore : gameCurrentInfo.value.home_score,
                awayScore : gameCurrentInfo.value.away_score,
            }
        })
    } catch (error) {
        
    }
}

const clearLineup = () => {
     lineup.value = {
        team_id: null,
        player_id: null,
        replaced_by: null,
        batting_order: null,
        replaced_inning: null,
        position : null,
    }

    selectedLineup.value = [null,null];

    runner_1b.value = null
    runner_2b.value = null
    runner_3b.value = null

    gameCurrentInfo.value = {
        inning : 1,
        inning_half : 'top',
        out : 0,
        strike : 0,
        ball : 0,
        away_current_out : 0,
        home_current_out : 0,
        away_pitch_count : 0,
        home_pitch_count : 0,
        away_current_pitch_count : 0,
        home_current_pitch_count : 0,
        away_batting_number : 0,
        away_current_batting_number : 0,
        home_batting_number : 0,
        home_current_batting_number : 0,
        away_score : 0,
        home_score : 0,
        runner_1b : null,
        runner_2b : null,
        runner_3b : null,
        is_available_stat : true,
    }

    errorPlayer.value = null;

    currentInning.value = 1;

    inningStats.value = {
        home: [],
        away: [],
        summary: {
            home: { R: 0, H: 0, E: 0, B: 0 },
            away: { R: 0, H: 0, E: 0, B: 0 }
        },
        maxInning: 9
    }
}

const getPlayerName = target => {
    return target?.replaced_player_name??target?.player_name
}

const getPlayerId = target => {
    return target?.replaced_by??target?.player_id
}

const getPlayerPosition = target => {
    return target?.replaced_position??target?.position
}

const getGameDetailInfo = async (game_id) => {
    try {
        lineupList.value = new Array(10).fill(null).map(() => ({ away: [], home: [] }));
        clearLineup();
        
        await Promise.all([
            commonFetch(`/api/admin/game/${game_id}`),
            commonFetch(`/api/admin/game/current-info/${game_id}`),
        ]).then(async ([gameMasterRes, gameCurrentRes]) => {
            if(gameMasterRes.success){
                awayTeamInfo.value = gameMasterRes.data.awayTeamInfo
                homeTeamInfo.value = gameMasterRes.data.homeTeamInfo
                selectedMatchup.value = gameMasterRes.data.gameInfo
                await getRosterDetailInfo(selectedMatchup.value.away_team_id,selectedMatchup.value.home_team_id);
                if(selectedMatchup.value.status === "completed"){
                    await getCompletedInfo();
                }
            }else{
                awayTeamInfo.value = [];
                homeTeamInfo.value = [];
                selectedMatchup.value = null;
                throw new Error();
            }

            if(gameCurrentRes.success){                
                gamedayInfo.value = gameCurrentRes.data.gamedayInfo;
                if(gameCurrentRes.data.lastGameInfo){
                    gameCurrentInfo.value = gameCurrentRes.data.lastGameInfo;
                    gameStartInfo.value = gameCurrentRes.data.lastGameInfo;
                    currentInning.value = gameCurrentRes.data.lastGameInfo.inning;
                }
            }else{
                throw new Error();
            }
        })

        return true
    } catch (error) {
        alert("게임 정보 조회 중 문제가 발생하였습니다.\n다시 한 번 시도해주세요.");
    }
}

const getCompletedInfo = async () => {
    try {
        const response = await commonFetch(`/api/admin/game/${selectedMatchup.value.game_id}/completed-info`)

        if(response.success){
            winning_pitcher_yn.value = !!response.data.gameCompletedInfo.win;
            winning_pitcher.value = response.data.gameCompletedInfo.win?.player_id

            losing_pitcher_yn.value = !!response.data.gameCompletedInfo.loss;
            losing_pitcher.value = response.data.gameCompletedInfo.loss?.player_id

            save_pitcher_yn.value = !!response.data.gameCompletedInfo.save;
            save_pitcher.value = response.data.gameCompletedInfo.save?.player_id
            
            hold_pitcher_yn.value = response.data.gameCompletedInfo.hold.length > 0;
            hold_pitcher.value = response.data.gameCompletedInfo.hold?.map(info => info?.player_id)
            
            blown_save_pitcher_yn.value = response.data.gameCompletedInfo.blown_save.length > 0;
            blown_save_pitcher.value = response.data.gameCompletedInfo.blown_save?.map(info => info?.player_id)

            fullPlayerStats.value = response.data.fullPlayerStats
        }
    } catch (error) {
        alert("게임 완료 정보 조회 중 오류가 발생했습니다.\n다시 시도해주세요.","error")
    }
}

const getRosterDetailInfo = async (awayTeamId, homeTeamId) => {
    try {
        Promise.all([
            commonFetch(`/api/admin/roster/${awayTeamId}?date=${selectedMatchup.value.game_date}`)
            , commonFetch(`/api/admin/roster/${homeTeamId}?date=${selectedMatchup.value.game_date}`)
        ]).then(([awayRes, homeRes])=>{
            if(awayRes.success){
                awayTeamRosterInfo.value = awayRes.data.rosterInfo
            }else throw new Error();

            if(homeRes.success){
                homeTeamRosterInfo.value = homeRes.data.rosterInfo
            }else throw new Error();
        })

        return true
    } catch (error) {
        alert("게임 로스터 조회 중 문제가 발생하였습니다.\n다시 한 번 시도해주세요.");
    }
}

const setCurrentInning = (inning) => {
    currentInning.value = inning;
}

const setCurrentGamedayInfo = async (type) => {
    if(selectedMatchup.value.status !== 'playball') return;
    const pushData = {...gameCurrentInfo.value, batter: {...currentBatter.value}, pitcher : {...currentPitcher.value}, type:type};
    if(!!!gamedayInfo.value[gameCurrentInfo.value.inning]) gamedayInfo.value[gameCurrentInfo.value.inning] = {}
    if(!!!gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half]) gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half] = {}
    if(!!!gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half][isAway.value?gameCurrentInfo.value.away_batting_number:gameCurrentInfo.value.home_batting_number]){
        try {
            const response = await commonFetch(`/api/admin/game/current-info`,{
                method : 'POST'
                , body : {
                    ...pushData
                    , game_id : selectedMatchup.value.game_id
                    , type:'startInfo'
                }
            })

            if(response.success){
                gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half][isAway.value?gameCurrentInfo.value.away_batting_number:gameCurrentInfo.value.home_batting_number] = [
                    { batter : {...currentBatter.value}, pitcher : {...currentPitcher.value}, type:'startInfo' },
                ];
            }
        } catch (error) {
            alert("게임 정보 저장 중 오류가 발생했습니다.\n다시 시도해주세요.","error")
        }
    }

    try {
        const response = await commonFetch(`/api/admin/game/current-info`,{
            method : 'POST'
            , body : {
                ...pushData
                , game_id : selectedMatchup.value.game_id
            }
        })

        if(response.success && type !== "lastInfo"){
            gamedayInfo.value?.[gameCurrentInfo.value.inning]?.[gameCurrentInfo.value.inning_half]?.[isAway.value?gameCurrentInfo.value.away_batting_number:gameCurrentInfo.value.home_batting_number]?.push(pushData)
        }
    } catch (error) {
        console.error(error);
        alert("게임 정보 저장 중 오류가 발생했습니다.\n다시 시도해주세요.","error")
    }
}

const setPitcherGameStats = async (stats, pitcher, dailyYn=false, seasonYn=false) => {
    if(!!!pitcher) pitcher = currentPitcher.value;
    
    try {
        const response = await commonFetch(`/api/admin/game/pitcher/stats`,{
            method : 'POST'
            , body : {
                stats
                , game_id : selectedMatchup.value.game_id
                , player_id : getPlayerId(pitcher)
                , team_id : pitcher.team_id
                , opponent_team_id : (pitcher.team_id===selectedMatchup.value.home_team_id?selectedMatchup.value.away_team_id:selectedMatchup.value.home_team_id)
                , batting_order : pitcher.batting_order
                , inning : gameCurrentInfo.value.inning
                , inning_half : gameCurrentInfo.value.inning_half
                , out : gameCurrentInfo.value.out
                , seasonYn
                , dailyYn
            }
        })
    } catch (error) {
        console.error(error)
        alert("투수 스탯 저장 중 오류가 발생했습니다.\n다시 시도해주세요.","error")
    }
}

const setGameOver = async (dail) => {
    alert("게임이 종료되었습니다.");
    
    const homePitcher = lineupList.value[0]?.['home']?.at(-1);
    const awayPitcher = lineupList.value[0]?.['away']?.at(-1);

    await setPitcherGameStats({
        pitches_thrown : gameCurrentInfo.value.home_pitch_count - ((getPlayerId(homePitcher)!==selectedMatchup.value.home_suspended_pitcher_id)?0:selectedMatchup.value.home_pitch_count),
        outs_pitched : gameCurrentInfo.value.home_current_out - ((getPlayerId(homePitcher)!==selectedMatchup.value.home_suspended_pitcher_id)?0:selectedMatchup.value.home_current_out),
        batters_faced : gameCurrentInfo.value.away_current_batting_number - ((getPlayerId(homePitcher)!==selectedMatchup.value.home_suspended_pitcher_id)?0:selectedMatchup.value.away_current_batting_number)
    }, homePitcher);

    await setPitcherGameStats({
        pitches_thrown : gameCurrentInfo.value.away_pitch_count - ((getPlayerId(awayPitcher)!==selectedMatchup.value.away_suspended_pitcher_id)?0:selectedMatchup.value.away_pitch_count),
        outs_pitched : gameCurrentInfo.value.away_current_out - ((getPlayerId(awayPitcher)!==selectedMatchup.value.away_suspended_pitcher_id)?0:selectedMatchup.value.away_current_out),
        batters_faced : gameCurrentInfo.value.home_current_batting_number - ((getPlayerId(awayPitcher)!==selectedMatchup.value.away_suspended_pitcher_id)?0:selectedMatchup.value.home_current_batting_number)
    }, awayPitcher);
    
    gameCurrentInfo.value.home_pitch_count = 0;
    gameCurrentInfo.value.away_current_batting_number = 0;
    gameCurrentInfo.value.home_current_out = 0;
    gameCurrentInfo.value.away_pitch_count = 0;
    gameCurrentInfo.value.home_current_batting_number = 0;
    gameCurrentInfo.value.away_current_out = 0;

    await setCurrentGamedayInfo('gameEnd');
    await setCurrentGamedayInfo('lastInfo');
    await updateGameStatus('completed');
    await updateGameDailyStats();
    await updateGameSeasonStats();
    await updateGameScore();
}

onMounted(async ()=>{
    await getGameDetailInfo(gameId)
})
</script>

<style scoped>
:deep(.selected .v-list-item__overlay){
    background-color: currentColor;
    opacity: var(--v-selected-opacity);
}

:deep(.no-cell-padding) th,
:deep(.no-cell-padding) td {
    padding-left: 5px !important;
    padding-right: 5px !important;
}

:deep(.border-right){
    border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

:deep(.border-left){
    border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

:deep(.no-cell-padding) th,
:deep(.no-cell-padding) td {
    padding-left: 3px !important;
    padding-right: 3px !important;
}

.selected-lineup{
    background: #ededed;
}

.chip-container {
    max-width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
}

.content-card {
    height: 300px;
    border-radius: 12px;
    border: 1px solid #e0e0e0;
}

.content-wrapper {
    padding: 16px;
    display: flex;
    color: #616161;
    flex-wrap: wrap;
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 100%;
}

.team-name {
    word-break: keep-all;
}
</style>