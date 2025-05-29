<template>
    <!-- 상단 달력 -->
    <v-row class="mb-4">
        <v-col cols="12" class="d-flex justify-space-between align-center">
            <span class="text-h6 font-weight-bold">KBO 경기 관리</span>
            <div class="d-flex align-center">
                <span class="text-h6 mr-2">{{ formattedDate }}</span>
                <v-menu v-model="calendarOpen" transition="scale-transition" max-width="290" :close-on-content-click="false">
                    <template v-slot:activator="{ props }">
                        <v-btn icon v-bind="props">
                            <v-icon>mdi-calendar</v-icon>
                        </v-btn>
                    </template>
                    <v-date-picker 
                        v-model="selectedDate" 
                        @update:model-value="updateMatchups">
                    </v-date-picker>
                </v-menu>
            </div>
        </v-col>
    </v-row>

    <!-- 경기 목록과 경기 정보 -->
    <v-row align="stretch">
        <v-col cols="12">
            <v-card class="h-100">
                <!-- 타이틀 영역 -->
                <v-card-title class="d-flex justify-space-between align-center">
                    경기 목록
                    <v-icon @click="toggleExpand">{{ isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-card-title>

                <v-divider></v-divider>

                <!-- 접었다 펼칠 수 있는 영역 -->
                <v-expand-transition>
                    <div v-if="isExpanded">
                        <v-list>
                            <v-list-item 
                                v-for="(matchup, index) in gameList" 
                                :key="index" 
                                @click="selectMatchup(index)"
                                :class="{selected : selectedMatchup?.game_id === matchup.game_id}"
                            >
                                <div class="d-flex justify-space-between align-center mb-4 mt-2">
                                    <div>
                                        <v-list-item-title>
                                            {{ matchup.away_team_name }} vs {{ matchup.home_team_name }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ matchup.game_date }} | {{ matchup.game_time }} | {{ STADIUMS.find(sdm => sdm.code === matchup.stadium)?.name ?? '' }}
                                        </v-list-item-subtitle>
                                    </div>
                                    <v-btn v-if="matchup.status === 'scheduled'" icon @click.stop="deleteMatchup(matchup.game_id)">
                                        <v-icon>mdi-delete</v-icon>
                                    </v-btn>
                                </div>
                                <v-divider></v-divider>                       
                            </v-list-item>
                        </v-list>

                        <!-- 경기 추가 폼 -->
                        <v-container>
                            <v-row>
                                <v-col cols="6" class="py-0">
                                    <v-select
                                        v-model="selectedAwayTeam"
                                        :items="teamList.filter(team => team.id !== selectedHomeTeam && !gameList.find(game => game.away_team_id === team.id || game.home_team_id === team.id))"
                                        item-value="id"
                                        item-title="name"
                                        label="원정팀"
                                    />
                                </v-col>

                                <v-col cols="6" class="py-0">
                                    <v-select
                                        v-model="selectedHomeTeam"
                                        :items="teamList.filter(team => team.id !== selectedAwayTeam && !gameList.find(game => game.away_team_id === team.id || game.home_team_id === team.id))"
                                        item-value="id"
                                        item-title="name"
                                        label="홈팀"
                                    />
                                </v-col>

                                <v-col cols="6" class="py-0">
                                    <v-select
                                        v-model="stadium"
                                        :items="STADIUMS"
                                        item-value="code"
                                        item-title="name"
                                        label="경기장"
                                    />
                                </v-col>

                                <v-col cols="6" class="py-0">
                                    <v-text-field
                                        v-model="gameTime"
                                        label="경기 시간"
                                        type="time"
                                    />
                                </v-col>

                                <v-col cols="12">
                                    <v-btn
                                        :disabled="!canAddMatchup"
                                        @click="addMatchup"
                                        color="primary"
                                        block
                                    >
                                        경기 추가
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-container>
                    </div>
                </v-expand-transition>
            </v-card>
        </v-col>

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
                                <div class="game-header d-flex justify-space-between align-center">
                                    <div class="d-flex justify-center align-center w-100">
                                        <img :src="selectedMatchup.away_team_path" alt="Away Team Logo" class="team-logo" />
                                        <span class="text-h6 font-weight-bold">{{ selectedMatchup.away_team_name }}</span>    
                                    </div>
                                    <div class="d-flex justify-center align-center">
                                        <span class="text-h4 font-weight-bold">{{ gameCurrentInfo.away_score }}</span>
                                        <span class="vs mx-8">VS</span>
                                        <span class="text-h4 font-weight-bold">{{ gameCurrentInfo.home_score }}</span>
                                    </div>
                                    <div class="d-flex justify-center align-center w-100">
                                        
                                        <span class="text-h6 font-weight-bold">{{ selectedMatchup.home_team_name }}</span>
                                        <img :src="selectedMatchup.home_team_path" alt="Home Team Logo" class="team-logo" />
                                    </div>
                                </div>
                                <div class="d-flex justify-center flex-column align-center mt-2">
                                    <p><strong>경기장:</strong> {{ STADIUMS.find(sdm => sdm.code === selectedMatchup.stadium)?.name??'' }}</p>
                                    <p><strong>경기일시:</strong> {{ selectedMatchup.game_date }} {{ selectedMatchup.game_time }}</p>
                                </div>
                                <div class="d-flex justify-center align-center mt-2" style="gap:8px;">
                                    <v-chip link v-if="selectedMatchup.status === 'scheduled' && lineupList.filter(ll => ll.away.length > 0 && ll.home.length >0).length=== 10" color="primary" @click="updateGameStatus('playball')">
                                        경기시작
                                    </v-chip>
                                    <v-chip link v-else-if="selectedMatchup.status === 'playball'" color="primary" @click="updateGameStatus('completed')">
                                        경기종료
                                    </v-chip>
                                    <v-chip link v-if="selectedMatchup.status !== 'completed' && selectedMatchup.status !== 'cancelled'" color="error" @click="updateGameStatus('cancelled')">
                                        경기취소
                                    </v-chip>
                                </div>
                            </div>
                            <div v-else class="text-center">
                                <span class="text-h6">선택된 경기가 없습니다.</span>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" md="4">
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
                                        v-for="number in 12"
                                        :key="number"
                                        class="d-flex justify-center align-center cursor-pointer"
                                        size="small"
                                        :variant="number === currentInning ? 'tonal' : 'text'"
                                        @click="setCurrentInning(number)"
                                    >
                                        {{ number }}회
                                    </v-chip>
                                </div>

                                <!-- 아래의 내용 영역 -->
                                <v-card class="content-card mt-3" elevation="2">
                                    <div class="content-wrapper" ref="contentCard">
                                        <!-- {{  console.log(JSON.stringify(gamedayInfo))??'' }} -->
                                        <div v-for="(inningInfo, topBottom) in gamedayInfo[currentInning]" class="w-100">
                                            <div>
                                                <span>{{currentInning}}회 {{ topBottom==='top'?"초":"말" }}</span>
                                            </div>
                                            <div v-for="(outInfo, outcount) in inningInfo">
                                                <div>
                                                    <br>
                                                    <v-divider></v-divider>
                                                    <br>
                                                    <span>{{ outInfo[0]?.batter?.batting_order }}번 타자 : {{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }}</span>
                                                    <br>
                                                    <span>투수 : {{ outInfo[0]?.pitcher?.replaced_player_name??outInfo[0]?.pitcher?.player_name }}</span>
                                                </div>
                                                <br>
                                                <div v-for="(ballInfo, index) in outInfo">
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
                                                            ? (ballInfo?.batter?.replaced_player_name ?? ballInfo?.batter?.player_name)
                                                            : (ballInfo?.['runner_' + ballInfo.type.split(':')[1] + 'b']?.replaced_player_name 
                                                                ?? ballInfo?.['runner_' + ballInfo.type.split(':')[1] + 'b']?.player_name) }}
                                                        )
                                                    </div>
                                                    <div v-else-if="['hit'].includes(ballInfo.type)" class="text-primary">
                                                        안타 ({{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }})
                                                    </div>
                                                    <div v-else-if="['double'].includes(ballInfo.type)" class="text-primary">
                                                        2루타 ({{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }})
                                                    </div>
                                                    <div v-else-if="['triple'].includes(ballInfo.type)" class="text-primary">
                                                        3루타 ({{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }})
                                                    </div>
                                                    <div v-else-if="['homerun'].includes(ballInfo.type)" class="text-primary">
                                                        홈런 ({{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('runner')">
                                                        {{ ballInfo.type.split(':')[1]==='0'?'타자주자':ballInfo.type.split(':')[1]+'루' }} -> {{ ballInfo.type.split(':')[2]==='4'?"홈":ballInfo.type.split(':')[2]+'루' }} 진루 ({{ ballInfo.type.split(':')[1] === '0'?(ballInfo?.batter?.replaced_player_name??ballInfo?.batter?.player_name) :(ballInfo?.['runner_'+ballInfo.type.split(':')[1]+'b']?.replaced_player_name??ballInfo?.['runner_'+ballInfo.type.split(':')[1]+'b']?.player_name) }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('score')" class="text-primary">
                                                        {{ ballInfo.type.split(':')[1] === "4" ? (outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name) : (ballInfo['runner_'+ballInfo.type.split(':')[1]+'b']?.replaced_player_name??ballInfo['runner_'+ballInfo.type.split(':')[1]+'b']?.player_name) }} 득점
                                                    </div>
                                                    <div v-else-if="['rbi'].includes(ballInfo.type)">
                                                        {{ ballInfo?.batter?.replaced_player_name??ballInfo?.batter?.player_name }} 타점
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('stolenBase')">
                                                        {{ ballInfo.type.split(':')[1] === "4"?"홈":ballInfo.type.split(':')[1]+"루"}} 도루 ({{ ballInfo['runner_'+(Number(ballInfo.type.split(':')[1])-1)+'b']?.replaced_player_name??ballInfo['runner_'+(Number(ballInfo.type.split(':')[1])-1)+'b']?.player_name }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('caughtStealing')" class="text-error">
                                                        {{ ballInfo.type.split(':')[1] === "4"?"홈":ballInfo.type.split(':')[1]+"루"}} 도루 실패 ({{ ballInfo['runner_'+(Number(ballInfo.type.split(':')[1])-1)+'b']?.replaced_player_name??ballInfo['runner_'+(Number(ballInfo.type.split(':')[1])-1)+'b']?.player_name }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('pickoff')" class="text-error">
                                                        {{ ballInfo.type.split(':')[1] === "4"?"홈":ballInfo.type.split(':')[1]+"루"}} 주자 견제사 ({{ ballInfo['runner_'+ballInfo.type.split(':')[1]+'b']?.replaced_player_name??ballInfo['runner_'+ballInfo.type.split(':')[1]+'b']?.player_name }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('sacrificeFly')" class="text-secondary">
                                                        희생플라이 ({{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }})
                                                    </div>
                                                    <div v-else-if="ballInfo.type.startsWith('sacrificeBunt')" class="text-secondary">
                                                        희생번트 ({{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }})
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
                <v-col cols="12" md="8">
                    <v-card class="h-100">
                        <v-card-title>경기 정보 등록</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text v-if="selectedMatchup.status === 'playball'">
                            <v-row>
                                <v-col cols="12">
                                    <div class="mb-3">
                                        <span class="text-subtitle-1 font-weight-bold">경기 진행 상황</span>
                                    </div>
                                    <div v-if="gameCurrentInfo.is_available_stat">
                                        <v-chip-group column>
                                            <v-chip class="text-orange cursor-pointer" @click="setStrike">스트라이크</v-chip>
                                            <v-chip class="text-orange cursor-pointer" @click="setSwingAndMiss">헛스윙</v-chip>
                                            <v-chip class="text-orange cursor-pointer" @click="setPitchclockStrike">피치클락 위반 (스트라이크)</v-chip>
                                            <v-chip class="text-brown cursor-pointer" @click="setFoul">파울</v-chip>
                                            <v-chip class="text-green cursor-pointer" @click="setBall">볼</v-chip>
                                            <v-chip class="text-green cursor-pointer" @click="setPitchclockBall">피치클락 위반 (볼)</v-chip>
                                        </v-chip-group>
                                    </div>
                                    <div v-if="!gameCurrentInfo.is_available_stat">
                                        <v-chip-group column>
                                            <v-chip class="text-primary cursor-pointer" @click="setForceNonOut">타석 종료 (아웃X)</v-chip>
                                            <v-chip class="text-error cursor-pointer" @click="setForceOut">타석 종료 (아웃O)</v-chip>
                                            <v-chip class="text-green cursor-pointer" @click="setBatterAsRunner">타자 주자 진루</v-chip>
                                        </v-chip-group>
                                    </div>
                                </v-col>
                                <v-col cols="12" v-if="gameCurrentInfo.is_available_stat">
                                    <div class="mb-3">
                                        <span class="text-subtitle-1 font-weight-bold">타격 결과</span>
                                    </div>
                                    <v-chip-group column>
                                        <v-chip class="text-primary" @click="setHit">안타</v-chip>
                                        <v-chip class="text-primary" @click="setDouble">2루타</v-chip>
                                        <v-chip class="text-primary" @click="setTriple">3루타</v-chip>
                                        <v-chip class="text-primary" @click="setHomerun">홈런</v-chip>
                                        <v-chip class="text-error" @click="setFlyout">플라이 아웃</v-chip>
                                        <v-chip class="text-error" @click="setGroundout">땅볼 아웃</v-chip>
                                        <v-chip class="text-error" @click="setLinedrive">직선타</v-chip>
                                        <v-chip class="text-error" @click="setFieldersChoice">야수선택</v-chip>
                                        <v-chip class="text-error" @click="setDoublePlay">더블 플레이</v-chip>
                                        <v-chip class="text-error" @click="setTriplePlay">트리플 플레이</v-chip>
                                    </v-chip-group>
                                </v-col>
                                <v-col cols="12" md="6" v-if="gameCurrentInfo.is_available_stat">
                                    <div class="mb-3">
                                        <span class="text-subtitle-1 font-weight-bold">희생타</span>
                                    </div>
                                    <v-chip-group column>
                                        <v-chip class="text-secondary" @click="setSacrificeFly">희생플라이</v-chip>
                                        <v-chip class="text-secondary" @click="setSacrificeBunt">희생번트</v-chip>
                                    </v-chip-group>
                                </v-col>
                                <v-col cols="12" md="6" v-if="gameCurrentInfo.is_available_stat">
                                    <div class="mb-3">
                                        <span class="text-subtitle-1 font-weight-bold">사구</span>
                                    </div>
                                    <v-chip-group column>
                                        <v-chip class="text-green" @click="setHitByPitch">사구</v-chip>
                                        <v-chip class="text-green" @click="setIntentionalBaseOnBalls">고의사구</v-chip>
                                    </v-chip-group>
                                </v-col>
                                <v-col>
                                    <div class="mb-3">
                                        <span class="text-subtitle-1 font-weight-bold">실책</span>
                                    </div>
                                    <v-chip-group column>
                                        <v-chip class="text-purple" @click="setWildPitch">폭투</v-chip>
                                        <v-chip class="text-purple" @click="setPassedBall">포일</v-chip>
                                        <v-chip class="text-purple" @click="setBalk">보크</v-chip>
                                        <div class="d-flex" style="gap:8px">
                                            <v-select
                                                density="compact"
                                                v-model="errorPlayer"
                                                :items="lineupList.map(inning => {
                                                    const arr = inning[isAway?'home':'away'];
                                                    return arr.length > 0 ? arr[arr.length - 1] : null;
                                                }).filter(item => !['DH'].includes(item?.replaced_position??item?.position))"
                                                :item-title="item => `(${item?.replaced_position??item?.position}) ${item?.replaced_player_name??item?.player_name} `"
                                                item-value="player_id"
                                            ></v-select>
                                            <v-chip class="text-purple" @click="setError">
                                                실책
                                            </v-chip>
                                        </div>
                                    </v-chip-group>
                                </v-col>
                                <v-col cols="12">
                                    <div class="mb-3">
                                        <span class="text-subtitle-1 font-weight-bold">주자</span>
                                    </div>
                                    <div v-if="gameCurrentInfo.runner_1b?.player_id">
                                        1루 주자 : {{ gameCurrentInfo.runner_1b.replaced_player_name??gameCurrentInfo.runner_1b.player_name }}
                                        <!-- 기록 표시 -->
                                        <v-chip-group multiple column class="mt-2" >
                                            <v-chip class="text-indigo" @click="setStolenBaseToSecond">도루</v-chip>
                                            <v-chip class="text-pink"  @click="setCaughtStealingSecondBase">도루실패</v-chip>
                                            <v-chip class="text-pink"  @click="setPickoffFromFirst">견제사</v-chip>
                                            <div class="d-flex" style="gap:8px">
                                                <v-select
                                                    density="compact"
                                                    v-model="runner_1b"
                                                    :items="[
                                                        { code:1, name:'1베이스' },
                                                        { code:2, name:'2베이스' },
                                                        { code:3, name:'3베이스' },
                                                    ]"
                                                    item-title="name"
                                                    item-value="code"
                                                ></v-select>
                                                <v-chip class="d-flex align-center justift-center text-indigo" @click="setRunnerAdvanceFromFirst(runner_1b)">
                                                    진루
                                                </v-chip>
                                            </div>
                                            
                                            <v-chip class="text-pink" @click="setFirstRunnerOut">아웃</v-chip>
                                        </v-chip-group>
                                    </div>
                                    <div v-if="gameCurrentInfo.runner_2b?.player_id">
                                        2루 주자 : {{ gameCurrentInfo.runner_2b.replaced_player_name??gameCurrentInfo.runner_2b.player_name }}
                                        <!-- 기록 표시 -->
                                        <v-chip-group multiple column class="mt-2" >
                                            <v-chip class="text-indigo" @click="setStolenBaseToThird">도루</v-chip>
                                            <v-chip class="text-pink"   @click="setCaughtStealingThirdBase">도루실패</v-chip>
                                            <v-chip class="text-pink"   @click="setPickoffFromSecond">견제사</v-chip>
                                            <div class="d-flex" style="gap:8px">
                                                <v-select
                                                    density="compact"
                                                    v-model="runner_2b"
                                                    :items="[
                                                        { code:1, name:'1베이스' },
                                                        { code:2, name:'2베이스' }
                                                    ]"
                                                    item-title="name"
                                                    item-value="code"
                                                ></v-select>
                                                <v-chip class="d-flex align-center justift-center text-indigo" @click="setRunnerAdvanceFromSecond(runner_2b)">
                                                    진루
                                                </v-chip>
                                            </div>
                                            
                                            <v-chip class="text-pink" @click="setSecondRunnerOut">아웃</v-chip>
                                        </v-chip-group>
                                    </div>
                                    <div v-if="gameCurrentInfo.runner_3b?.player_id">
                                        3루 주자 : {{ gameCurrentInfo.runner_3b.replaced_player_name??gameCurrentInfo.runner_3b.player_name }}
                                        <!-- 기록 표시 -->
                                        <v-chip-group multiple column class="mt-2" >
                                            <v-chip class="text-indigo" @click="setStolenBaseToHome">도루</v-chip>
                                            <v-chip class="text-pink"   @click="setCaughtStealingHomeBase">도루실패</v-chip>
                                            <v-chip class="text-pink"   @click="setPickoffFromThird">견제사</v-chip>
                                            <v-chip class="text-indigo" @click="setRunnerAdvanceFromThird">
                                                1베이스 진루
                                            </v-chip>
                                            <v-chip class="text-pink" @click="setThirdRunnerOut">아웃</v-chip>
                                        </v-chip-group>
                                    </div>
                                </v-col>
                            </v-row>
                            <!-- <v-tabs v-model="activeTab">
                                <v-tab value="0" v-if="selectedMatchup.status === 'playball'">타자 기록 등록</v-tab>
                                <v-tab value="1" v-if="selectedMatchup.status === 'playball'">투수 기록 등록</v-tab>
                            </v-tabs>

                            <v-window v-model="activeTab">
                                <v-window-item value="1" v-if="selectedMatchup.status === 'playball'">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <p>타자 기록 화면이 여기에 표시됩니다.</p>
                                            </v-col>
                                        </v-row>
                                    </v-container>
                                </v-window-item>
                                <v-window-item value="2" v-if="selectedMatchup.status === 'playball'">
                                    <v-container>
                                        <v-row>
                                            <v-col cols="12">
                                                <p>투수 기록 화면이 여기에 표시됩니다.</p>
                                            </v-col>
                                        </v-row>
                                    </v-container>
                                </v-window-item>
                            </v-window> -->
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" md="4">
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
                                <v-col class="d-flex flex-column" :class="{'selected-lineup' : selectedLineup[0] === 'away' && selectedLineup[1] === index}">
                                    <div v-for="(away, aIdx) in lineupList[((index + 1)%10)]?.away" class="d-flex justify-space-between cursor-pointer" @click="setPlayerInfo('away',index,aIdx)">
                                        <v-icon 
                                            v-if="(aIdx === 0 && selectedMatchup.status === 'scheduled') || (aIdx > 0 && selectedMatchup.status === 'playball' && lineupList[((index + 1)%10)]?.away.length-1 === aIdx)" 
                                            color="error" 
                                            class="cursor-pointer"
                                        >mdi-delete</v-icon>
                                        <span class="w-100" @click="setPlayerInfo('away',index,hIdx)">
                                            {{ (away?.replaced_position??away?.position)?'(':'' }}{{ (away?.replaced_position??away?.position) }}{{ (away?.replaced_position??away?.position)?') ':'' }}{{ away?.replaced_player_name??away?.player_name }}
                                        </span>
                                    </div>
                                </v-col>
                                <span class="pa-3 ">{{ ((index + 1)%10)===0 ? "투수" : ((index + 1)%10) + "번" }}</span>
                                <v-col class="d-flex flex-column" :class="{'selected-lineup' : selectedLineup[0] === 'home' && selectedLineup[1] === index}">
                                    <div v-for="(home, hIdx) in lineupList[((index + 1)%10)]?.home" class="d-flex justify-space-between cursor-pointer" @click="setPlayerInfo('home',index,hIdx)">
                                        <span class="w-100">
                                            {{ (home?.replaced_position??home?.position)?'(':'' }}{{ (home?.replaced_position??home?.position) }}{{ (home?.replaced_position??home?.position)?') ':'' }}{{ home?.replaced_player_name??home?.player_name }}
                                        </span>
                                        <v-icon 
                                            v-if="(hIdx === 0 && selectedMatchup.status === 'scheduled') || (hIdx > 0 && selectedMatchup.status === 'playball' && lineupList[((index + 1)%10)]?.home.length-1 === hIdx)" 
                                            color="error" 
                                            class="cursor-pointer"
                                            @click="deleteRoster(home?.roster_id)"
                                        >mdi-delete</v-icon>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="12" md="8">
                    <v-card class="h-100">
                        <v-card-title>라인업 설정</v-card-title>
                        <v-divider></v-divider>
                        <v-card-text>
                            <v-container>
                                <v-row>
                                    <v-col cols="12">
                                        <v-row>
                                            <v-col cols="12">
                                                <span class="text-h6">선수 선택</span>
                                            </v-col>
                                            <!-- 팀 선택 -->
                                            <v-col cols="12" md="3">
                                                <v-select
                                                    v-model="lineup.team_id"
                                                    :items="teams"
                                                    label="팀 선택"
                                                    item-value="id"
                                                    item-title="name"
                                                    :rules="[v => !!v || '팀을 선택해 주세요.']"
                                                    required
                                                />
                                            </v-col>

                                            <!-- 타순 선택 -->
                                            <v-col cols="12" md="3">
                                                <v-select
                                                    v-model="lineup.batting_order"
                                                    :items="battingOrders"
                                                    item-title="name"
                                                    item-value="code"
                                                    label="타순"
                                                    :rules="[v => (v!==null && v!==undefined) || '타순을 선택해 주세요.']"
                                                    required
                                                />
                                            </v-col>

                                            <!-- 선수 선택 -->
                                            <v-col cols="12" md="3">
                                                <v-select
                                                    :disabled="isReplace"
                                                    v-model="lineup.player_id"
                                                    :items="!!!lineupTeam?[]:activeRoster.filter(ar => {
                                                        if(lineupList[lineup.batting_order]?.[lineupTeam]?.length>0){
                                                            if(lineupList[lineup.batting_order]?.[lineupTeam]?.find(ll=>(ll.replaced_by??ll.player_id) === ar.player_id)) return true
                                                            else return false
                                                        }else{
                                                            let hasPlayer = false;
                                                            for(let idx=0;idx<lineupList.length;idx++){
                                                                if(lineupList[idx]?.[lineupTeam]?.find(ll => (ll.replaced_by??ll.player_id) === ar.player_id)){
                                                                    hasPlayer = true;
                                                                    break;
                                                                }
                                                            }
                                                            
                                                            if(hasPlayer) return false
                                                            else return true
                                                        }
                                                    })?.toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                    item-title="player_name"
                                                    item-value="player_id"
                                                    label="선수 선택"
                                                    :rules="[v => !!v || '선수를 선택해 주세요.']"
                                                    required
                                                />
                                            </v-col>

                                            <v-col cols="12" md="3">
                                                <v-select 
                                                    :disabled="isReplace"
                                                    v-model="lineup.position"
                                                    :items="POSITIONS.toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                    item-title="name"
                                                    item-value="code"
                                                    label="포지션"
                                                    :rules="[v => !!v || '포지션을 선택해 주세요.']"
                                                    required
                                                />
                                            </v-col>
                                        </v-row>
                                        <v-divider class="mb-4"></v-divider>
                                        <v-row v-if="isReplace && selectedMatchup.status !== 'scheduled' && lineupList.filter(ll => ll.away.length > 0 && ll.home.length >0).length === 10">
                                            <v-col cols="12">
                                                <span class="text-h6">교체 선수 선택</span>
                                            </v-col>
                                            <v-col cols="12" md="3">
                                                <v-select
                                                    v-model="lineup.replaced_position"
                                                    :items="POSITIONS.filter(pr=>{
                                                        if(lineup.batting_order === 0){
                                                            return pr.player_type === 'P'
                                                        }
                                                        return true
                                                    }).toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                    item-title="name"
                                                    item-value="code"
                                                    label="교체 포지션"
                                                    :rules="[v => !!v || '교체 포지션을 선택해 주세요.']"
                                                    required
                                                />
                                            </v-col>

                                            <!-- 교체 선수 선택 -->
                                            <v-col cols="12" md="3">
                                                <v-select
                                                    v-model="lineup.replaced_by"
                                                    :items="activeRoster.filter(ar => {
                                                        if(ar.player_id === lineup.player_id) return true
                                                        let hasPlayer = false;
                                                        for(let idx=0;idx<lineupList.length;idx++){
                                                            if(lineupList[idx]?.[lineupTeam]?.find(ll => (ll.replaced_by??ll.player_id) === ar.player_id)){
                                                                hasPlayer = true;
                                                                break;
                                                            }
                                                        }
                                                        
                                                        if(hasPlayer) return false
                                                        else return true
                                                    })?.toSorted((a,b)=>lineup.batting_order===0?b.player_type.localeCompare(a.player_type):a.player_type.localeCompare(b.player_type))"
                                                    item-title="player_name"
                                                    item-value="player_id"
                                                    label="교체 선수"
                                                    :rules="[v => !!v || '교체 선수를 선택해 주세요.']"
                                                    required
                                                />
                                            </v-col>
                                        </v-row>
                                        <v-row>
                                            <!-- 저장 버튼 -->
                                            <v-col cols="12" class="d-flex justify-end">
                                                <v-btn :disabled="!lineupValid" color="primary" @click="saveRoster">저장</v-btn>
                                            </v-col>
                                        </v-row>
                                    </v-col>
                                </v-row>
                            </v-container>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </v-col>
        <v-col cols="12" v-else>
            <v-card class="h-100 d-flex justify-center align-center">
                <v-card-title>선택된 경기가 없습니다.</v-card-title>
            </v-card>
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
import { consoleError } from 'vuetify/lib/util/console.mjs';

const router = useRouter();
const route = useRoute();

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
const stadium = ref('');
const gameTime = ref('18:30');

const canAddMatchup = computed(() => {
    return (
        selectedAwayTeam.value &&
        selectedHomeTeam.value &&
        stadium.value &&
        gameTime.value &&
        selectedAwayTeam.value !== selectedHomeTeam.value
    );
});

const contentCard = ref(null);

const currentInning = ref(1);

const lineupTeam = ref(null);
const isReplace = ref(false);
const lineupValid = computed(() => {
    if(!isReplace.value){
        return  lineup.value.team_id        !== null && lineup.value.team_id        !== undefined &&
                lineup.value.player_id      !== null && lineup.value.player_id      !== undefined &&
                lineup.value.batting_order  !== null && lineup.value.batting_order  !== undefined &&
                lineup.value.position       !== null && lineup.value.position       !== undefined
    }else{
        return  lineup.value.team_id        !== null && lineup.value.team_id        !== undefined &&
                lineup.value.player_id      !== null && lineup.value.player_id      !== undefined &&
                lineup.value.batting_order  !== null && lineup.value.batting_order  !== undefined &&
                lineup.value.position       !== null && lineup.value.position       !== undefined &&
                lineup.value.replaced_by    !== null && lineup.value.replaced_by    !== undefined &&
                lineup.value.position       !== null && lineup.value.position       !== undefined
    }
});
const lineup = ref({
    team_id: null,
    player_id: null,
    replaced_by: null,
    batting_order: null,
    replaced_position : null,
    position : null,
});

const gamedayInfo = ref({});

const gameCurrentInfo = ref({
    inning : 1,
    inning_half : 'top',
    out : 0,
    strike : 0,
    ball : 0,
    away_pitch_count : 0,
    home_pitch_count : 0,
    away_current_pitch_count : 0,
    home_current_pitch_count : 0,
    away_batting_number : 0,
    home_batting_number : 0,
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

const teams = ref([]);
const battingOrders = new Array(10).fill(null).map((val,idx) => ({ code :  (idx+1)%10 , name : (idx+1)%10 === 0 ? "투수" : (idx+1)%10 + "번 타자"}))
const roles = ['starter', 'bench', 'substitute'];
const innings = Array.from({ length: 12 }, (_, i) => i + 1); // 1~12회
const inning_half = [{code:'top',name:'초'},{code:'bottom',name:'말'}];
const outs = [0, 1, 2];

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
})

watch(()=>selectedHomeTeam.value, newVal => {
    if(newVal) stadium.value = teamList.value.find(team=>team.id===newVal)?.main_stadium
})

watch(()=>lineup.value.team_id,(newVal) => {
    lineupTeam.value = !!!newVal?null:(selectedMatchup.value.away_team_id === newVal?"away":(selectedMatchup.value.home_team_id === newVal?"home":null))
    activeRoster.value = !!!lineupTeam.value?[]:(lineupTeam.value === "away"?awayTeamRosterInfo.value:homeTeamRosterInfo.value)

    const lineupPlayer = lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.[lineupList.value?.[lineup.value.batting_order]?.[lineupTeam.value]?.length-1];
    if(lineupPlayer){
        lineup.value.player_id = lineupPlayer.replaced_by??lineupPlayer.player_id
        lineup.value.position = lineupPlayer.replaced_position??lineupPlayer.position
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
        lineup.value.player_id = lineupPlayer.replaced_by??lineupPlayer.player_id
        lineup.value.position = lineupPlayer.replaced_position??lineupPlayer.position
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

const updateMatchups = async (newVal) => {
    isExpanded.value = true
    router.replace(`/admin/game/management?date=${formatDate(newVal)}`)
    try {
        Promise.all([
            getTeamList(newVal.getUTCFullYear())
            , getGameList(formatDate(newVal))
        ]).then(([teamYn, gameYn])=>{
            if(gameYn){

            }
        })
    } catch (error) {
        alert("화면 조회 중 문제가 발생하였습니다.\n 다시 한 번 시도해주세요.","error");
    }
};

const selectMatchup = (index) => {
    isExpanded.value = false
    getGameDetailInfo(gameList.value[index].game_id)
};

const addMatchup = async () => {
    try {
        const response = await commonFetch("/api/admin/game/create",{
            method : "POST"
            , body : {
                season_year : formattedDate.value.split(".")[0],
                away_team_id: selectedAwayTeam.value,
                home_team_id: selectedHomeTeam.value,
                stadium     : stadium.value,
                game_date   : formattedDate.value,
                game_time   : gameTime.value
            }
        })

        if(response.success){
            selectedAwayTeam.value = null;
            selectedHomeTeam.value = null;
            stadium.value = '';
            gameTime.value = '18:30';
            await getGameList(formattedDate.value);
        }
    } catch (error) {
        
    }
};

const getTeamList = async (year) => {
    try {
        const response = await commonFetch(`/api/admin/team/list?year=${year}`);
        
        if(response.success){
            teamList.value = response.data.teamList
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

const getGameList = async (date) => {
    try {
        const response = await commonFetch(`/api/admin/game/list?gameDate=${date}`)
        
        if(response.success){
            gameList.value = response.data.gameList
            selectedMatchup.value = null;
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

const deleteMatchup = async (game_id) => {
    if(!await confirm("경기를 삭제하시겠습니까?")) return;
    
    try {
        const response = await commonFetch(`/api/admin/game/delete`,{
            method : "DELETE",
            body : {
                gameId : encryptData(game_id)
            }
        })
        
        if(response.success){
            await getGameList(formattedDate.value)
        }else throw new Error();

        return true
    } catch (error) {
        
    }
}

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
            getGameDetailInfo(gameId)
        }else throw new Error();

        return true
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
        away_pitch_count : 0,
        home_pitch_count : 0,
        away_current_pitch_count : 0,
        home_current_pitch_count : 0,
        away_batting_number : 0,
        home_batting_number : 0,
        away_score : 0,
        home_score : 0,
        runner_1b : null,
        runner_2b : null,
        runner_3b : null,
        is_available_stat : true,
    }

    errorPlayer.value = null;
}

const getGameDetailInfo = async (game_id) => {
    try {
        lineupList.value = new Array(10).fill(null).map(() => ({ away: [], home: [] }));
        clearLineup();
        
        Promise.all([
            commonFetch(`/api/admin/game/${game_id}`),
            commonFetch(`/api/admin/game/current-info/${game_id}`),
        ]).then(async ([gameMasterRes, gameCurrentRes]) => {
            if(gameMasterRes.success){
                awayTeamInfo.value = gameMasterRes.data.awayTeamInfo
                homeTeamInfo.value = gameMasterRes.data.homeTeamInfo
                selectedMatchup.value = gameMasterRes.data.gameInfo
                await getRosterDetailInfo(selectedMatchup.value.away_team_id,selectedMatchup.value.home_team_id);
            }else{
                awayTeamInfo.value = [];
                homeTeamInfo.value = [];
                selectedMatchup.value = null;
                throw new Error();
            }

            if(gameCurrentRes.success){                
                gamedayInfo.value = gameCurrentRes.data.gamedayInfo;
                if(gameCurrentRes.data.lastGameInfo){
                    gameCurrentInfo.value = gameCurrentRes.data.lastGameInfo
                    currentInning.value = gameCurrentRes.data.lastGameInfo.inning
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

const getRosterDetailInfo = async (awayTeamId, homeTeamId) => {
    try {
        Promise.all([
            commonFetch(`/api/admin/roster/${awayTeamId}?date=${formattedDate.value}`)
            , commonFetch(`/api/admin/roster/${homeTeamId}?date=${formattedDate.value}`)
            
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

const saveRoster = async () => {
    try {
        const response = await commonFetch("/api/admin/game/roster/create",{
            method : "POST"
            , body : {
                ...lineup.value
                , game_id : selectedMatchup.value.game_id
                , isReplace : isReplace.value
                , replaced_inning : gameCurrentInfo.value.inning
                , replaced_out : gameCurrentInfo.value.out
            }
        })

        if(response.success){
            getGameDetailInfo(selectedMatchup.value.game_id)
        }
    } catch (error) {
        alert("라인업 저장 중 문제가 발생하였습니다.\n다시 한 번 시도해주세요.");
    }
};

const deleteRoster = async(roster_id) => {
    if(!roster_id) return;

    try {
        const response = await commonFetch("/api/admin/game/roster/delete",{
            method : "DELETE"
            , body : {
                roster_id
            }
        })

        if(response.success){
            getGameDetailInfo(selectedMatchup.value.game_id)
        }
    } catch (error) {
        alert("라인업 삭제 중 문제가 발생하였습니다.\n다시 한 번 시도해주세요.");
    }
}

const setCurrentInning = (inning) => {
    currentInning.value = inning;
}

const setPlayerInfo = (teamFlag, orderIndex, replaceIndex) => {
    const playerInfo = lineupList.value[((orderIndex + 1)%10)]?.[teamFlag]?.[replaceIndex];
    
    if(!playerInfo) return;

    lineup.value = {
        team_id: playerInfo.team_id,
        player_id: null,
        replaced_by: null,
        batting_order: playerInfo.batting_order,
        replaced_inning: null,
        position : null,
    }

    selectedLineup.value = [teamFlag,orderIndex]
}

const setCurrentGamedayInfo = async (type) => {
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

const setBatterGameStats = async (stats, player_id) => {
    try {
        const response = await commonFetch(`/api/admin/game/batter/stats`,{
            method : 'POST'
            , body : {
                stats
                , game_id : selectedMatchup.value.game_id
                , player_id : player_id??currentBatter.value.player_id
                , team_id : currentBatter.value.team_id
                , opponent_team_id : currentPitcher.value.team_id
                , batting_order : currentBatter.value.batting_order
                , inning : gameCurrentInfo.value.inning
                , inning_half : gameCurrentInfo.value.inning_half
                , out : gameCurrentInfo.value.out
            }
        })
    } catch (error) {
        alert("타자 스탯 저장 중 오류가 발생했습니다.\n다시 시도해주세요.","error")
    }
}

const setPitcherGameStats = async (stats) => {
    try {
        const response = await commonFetch(`/api/admin/game/pitcher/stats`,{
            method : 'POST'
            , body : {
                stats
                , game_id : selectedMatchup.value.game_id
                , player_id : currentBatter.value.player_id
                , team_id : currentBatter.value.team_id
                , opponent_team_id : currentPitcher.value.team_id
                , batting_order : currentBatter.value.batting_order
                , inning : gameCurrentInfo.value.inning
                , inning_half : gameCurrentInfo.value.inning_half
                , out : gameCurrentInfo.value.out
            }
        })
    } catch (error) {
        alert("투수 스탯 저장 중 오류가 발생했습니다.\n다시 시도해주세요.","error")
    }
}

const setOut = async (battingNumberYn=true, confirmYn=true) => {
    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;
    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;

    if(confirmYn){
        if(!await confirm(`※ ${currentBatter.value.replaced_player_name??currentBatter.value.player_name}의 타석을 종료하시겠습니까?\n\n주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.`)){
            gameCurrentInfo.value.is_available_stat = false;
            return;
        }
    }

    if(battingNumberYn){
        if(isAway.value) gameCurrentInfo.value.away_batting_number++;
        else gameCurrentInfo.value.home_batting_number++;
    }
    
    const current_out = gameCurrentInfo.value.out;
    
    if(current_out<2) gameCurrentInfo.value.out++;
    else{
        gameCurrentInfo.value.out = 0;
        const current_inning_half = gameCurrentInfo.value.inning_half;
        gameCurrentInfo.value.runner_1b = null;
        gameCurrentInfo.value.runner_2b = null;
        gameCurrentInfo.value.runner_3b = null;
        if(current_inning_half === "top") gameCurrentInfo.value.inning_half = "bottom"
        else {
            gameCurrentInfo.value.inning++;
            currentInning.value = gameCurrentInfo.value.inning
            gameCurrentInfo.value.inning_half = "top"
        }
    }
}

const setForceNonOut = async () => {
    if(!await confirm("타석이 종료됩니다.")) return;
    
    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    gameCurrentInfo.value.is_available_stat = true;

    await setCurrentGamedayInfo('lastInfo');
}

const setForceOut = async () => {
    if(!await confirm("※ 선수 아웃처리가 안되었을 때 사용해주세요.\n\n타석이 종료되고 아웃카운트가 올라갑니다.")) return;
    
    await setOut(true,false)

    gameCurrentInfo.value.is_available_stat = true;

    await setCurrentGamedayInfo('lastInfo');
}

const setStrike = async () => {
    await setCurrentGamedayInfo('strike');

    const current_strike = gameCurrentInfo.value.strike;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++; 
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_strike<2){
        gameCurrentInfo.value.strike++;
    }
    else{
        await setCurrentGamedayInfo('strikeout');
        await setBatterGameStats({
            at_bats : 1,
            plate_appearances : 1,
            strikeouts : 1,
        });
        await setPitcherGameStats({
            strikeouts : 1,
        });
        
        await setOut();
    }
    await setCurrentGamedayInfo('lastInfo');
}

const setSwingAndMiss = async () => {
    await setCurrentGamedayInfo('swingAndMiss');

    const current_strike = gameCurrentInfo.value.strike;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++; 
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_strike<2){
        gameCurrentInfo.value.strike++;
    }
    else{
        await setCurrentGamedayInfo('strikeout');
        await setBatterGameStats({
            at_bats : 1,
            plate_appearances : 1,
            strikeouts : 1,
        });
        await setPitcherGameStats({
            strikeouts : 1,
        });
        
        await setOut();
    }
    await setCurrentGamedayInfo('lastInfo');
}

const setPitchclockStrike = async () => {
    await setCurrentGamedayInfo('pitchclockStrike');
    await setCurrentGamedayInfo('strike');

    const current_strike = gameCurrentInfo.value.strike;
    if(isAway.value){
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_strike<2){
        gameCurrentInfo.value.strike++;
    }
    else{
        await setCurrentGamedayInfo('strikeout');
        await setBatterGameStats({
            at_bats : 1,
            plate_appearances : 1,
            strikeouts : 1,
        });
        await setPitcherGameStats({
            strikeouts : 1,
        });
        
        await setOut();
    }
    await setCurrentGamedayInfo('lastInfo');
}

const setBall = async () => {
    await setCurrentGamedayInfo('ball');

    const current_ball = gameCurrentInfo.value.ball;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_ball<3){
        gameCurrentInfo.value.ball++;
    }
    else{
        gameCurrentInfo.value.strike = 0;
        gameCurrentInfo.value.ball = 0;
        await setBaseOnBalls();
        await setBatterGameStats({
            plate_appearances : 1,
            walks : 1,
        });
        await setPitcherGameStats({
            walks_allowed : 1,
        });
        if(isAway.value) gameCurrentInfo.value.away_batting_number++;
        else gameCurrentInfo.value.home_batting_number++;
    }
    await setCurrentGamedayInfo('lastInfo');
}

const setPitchclockBall = async () => {
    await setCurrentGamedayInfo('pitchclockBall');
    await setCurrentGamedayInfo('ball');

    const current_ball = gameCurrentInfo.value.ball;
    if(isAway.value){
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_ball<3){
        gameCurrentInfo.value.ball++;
    }
    else{
        gameCurrentInfo.value.strike = 0;
        gameCurrentInfo.value.ball = 0;
        await setBaseOnBalls();
        await setBatterGameStats({
            plate_appearances : 1,
            walks : 1,
        });
        await setPitcherGameStats({
            walks_allowed : 1,
        });
        if(isAway.value) gameCurrentInfo.value.away_batting_number++;
        else gameCurrentInfo.value.home_batting_number++;
    }
    await setCurrentGamedayInfo('lastInfo');
}

const setFoul = async () => {
    await setCurrentGamedayInfo('foul');

    const current_strike = gameCurrentInfo.value.strike;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_strike<2) gameCurrentInfo.value.strike++;

    await setCurrentGamedayInfo('lastInfo');
}

const setBaseOnBalls = async ()=>{
    await setCurrentGamedayInfo('baseonballs');
    
    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;

    const current_inning_half = gameCurrentInfo.value.inning_half;
    
    const runner1B = gameCurrentInfo.value.runner_1b;
    const runner2B = gameCurrentInfo.value.runner_2b;
    const runner3B = gameCurrentInfo.value.runner_3b;
    
    //3루 처리
    if(runner1B?.player_id && runner2B?.player_id && runner3B?.player_id){
        await setScore(3, false)

        gameCurrentInfo.value.runner_3b = null;
    }

    //2루처리
    if(runner1B?.player_id && runner2B?.player_id){
        gameCurrentInfo.value.runner_3b = runner2B;
        gameCurrentInfo.value.runner_2b = null;
    }

    //1루처리
    if(runner1B?.player_id){
        gameCurrentInfo.value.runner_2b = runner1B;
        gameCurrentInfo.value.runner_1b = null;
    }

    gameCurrentInfo.value.runner_1b = { ...currentBatter.value, pitcher : { ... currentPitcher.value } };
    
    await setCurrentGamedayInfo('lastInfo');
}

const setScore = async (scoreBase, rbiConfirmYn = true) => {
    const runnerInfo = scoreBase === 4 ? {...currentBatter.value, pitcher : {...currentPitcher.value }} : gameCurrentInfo.value['runner_'+scoreBase+'b']

    await setCurrentGamedayInfo('score:'+scoreBase);
    
    if(gameCurrentInfo.value.inning_half === "top") gameCurrentInfo.value.away_score++;
    else gameCurrentInfo.value.home_score++;

    await setBatterGameStats({
        runs : 1,
    }, runnerInfo.player_id);

    if(rbiConfirmYn){
        if(await confirm(`${runnerInfo.replaced_player_name??runnerInfo.player_name}의 득점을 ${currentBatter.value.replaced_player_name??currentBatter.value.player_name}의 타점으로 등록하시겠습니까?`)){
            await setCurrentGamedayInfo('rbi');

            await setBatterGameStats({
                runs_batted_in : 1,
            });
        }
    }
    
    if(runnerInfo && runnerInfo?.pitcher?.player_id){
        if(await confirm(`${runnerInfo.replaced_player_name??runnerInfo.player_name}의 득점을 ${runnerInfo?.pitcher?.replaced_player_name??runnerInfo?.pitcher?.player_name}의 자책점으로 등록하시겠습니까?`)){
            // 실점 등록하기
            await setPitcherGameStats({
                earned_runs : 1,
                runs_allowed : 1,
            });
        }else{
            await setPitcherGameStats({
                runs_allowed : 1,
            });
        }
    }
}

const setHit = async()=>{
    await setCurrentGamedayInfo('hitting');

    if(gameCurrentInfo.value.runner_3b?.player_id){
        if(gameCurrentInfo.value.runner_3b?.player_id
            && gameCurrentInfo.value.runner_2b?.player_id
            && gameCurrentInfo.value.runner_1b?.player_id
        ) await setRunnerAdvanceFromThird()
        else{
            const baseResult = await confirm("3루 주자를 홈베이스로 이동시키시겠습니까?");
            if(baseResult) await setRunnerAdvanceFromThird()
        }
    }

    if (gameCurrentInfo.value.runner_2b?.player_id) {
        if (!gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루 비어있고, 1루 있음 → 3루, 홈만 선택 가능
            // 3루 비어있고, 1루 없음 → 2루, 3루, 홈 선택 가능
            const options = [
                ...(!gameCurrentInfo.value.runner_1b?.player_id ? [{ id: 0, name: '2루' }] : []),
                { id: 1, name: '3루' },
                { id: 2, name: '홈' },
            ];

            const baseResult = await prompt(
                '2루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => (v!==undefined && v!==null && v!=='') || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) await setRunnerAdvanceFromSecond(baseResult);
            else await setRunnerAdvanceFromSecond(1)
        }
    }

    if (gameCurrentInfo.value.runner_1b?.player_id) {
        if (gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루에 주자가 있으면 1루 주자는 2루까지만 이동 가능
            await setRunnerAdvanceFromFirst(1);
        } else {
            // 3루에 주자가 없으면 선택 가능: 2루, 3루, 홈
            const options = [
                { id: 1, name: '2루' },
                { id: 2, name: '3루' },
                { id: 3, name: '홈' },
            ];

            const baseResult = await prompt(
                '1루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) await setRunnerAdvanceFromFirst(baseResult);
            else await setRunnerAdvanceFromFirst(1);
        }
    }

    await setCurrentGamedayInfo('hit');

    await setBatterGameStats({
        plate_appearances : 1,
        at_bats : 1,
        hits : 1,
        singles : 1,
    });
    await setPitcherGameStats({
        hits_allowed : 1,
        singles_allowed : 1,
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;
    gameCurrentInfo.value.runner_1b = { ...currentBatter.value, pitcher : { ...currentPitcher.value } };
    
    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;

    if(!await confirm(`※ ${currentBatter.value.replaced_player_name??currentBatter.value.player_name}의 타석을 종료하시겠습니까?\n\n주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.`)){
        gameCurrentInfo.value.is_available_stat = false;
        await setCurrentGamedayInfo('lastInfo');
        return;
    }

    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    await setCurrentGamedayInfo('lastInfo');
}

const setDouble = async () => {
    await setCurrentGamedayInfo('hitting');

    if(gameCurrentInfo.value.runner_3b?.player_id){
        if(gameCurrentInfo.value.runner_2b?.player_id || gameCurrentInfo.value.runner_1b?.player_id) 
            await setRunnerAdvanceFromThird()
        else{
            const baseResult = await confirm("3루 주자를 홈베이스로 이동시키시겠습니까?");
            if(baseResult) await setRunnerAdvanceFromThird()
        }
    }

    if (gameCurrentInfo.value.runner_2b?.player_id) {
        if (gameCurrentInfo.value.runner_1b?.player_id) {
            await setRunnerAdvanceFromSecond(2)
        }else{
            const options = [
                { id: 1, name: '3루' },
                { id: 2, name: '홈' },
            ];

            const baseResult = await prompt(
                '2루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) await setRunnerAdvanceFromSecond(baseResult);
            else await setRunnerAdvanceFromSecond(1);
        }
    }

    if (gameCurrentInfo.value.runner_1b?.player_id) {
        const options = [
            { id: 2, name: '3루' },
            { id: 3, name: '홈' },
        ];

        const baseResult = await prompt(
            '1루 주자가 이동할 베이스를 선택해주세요.',
            '',
            {
                type: 'select',
                options,
                itemValue: 'id',
                itemTitle: 'name',
                rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
            }
        );

        if (baseResult) await setRunnerAdvanceFromFirst(baseResult);
        else await setRunnerAdvanceFromFirst(1);
    }

    await setCurrentGamedayInfo('double');

    await setBatterGameStats({
        plate_appearances : 1,
        at_bats : 1,
        hits : 1,
        doubles : 1,
    });
    await setPitcherGameStats({
        hits_allowed : 1,
        doubles_allowed : 1,
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;
    gameCurrentInfo.value.runner_2b = { ...currentBatter.value, pitcher : { ...currentPitcher.value } };
    
    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;

    if(!await confirm(`※ ${currentBatter.value.replaced_player_name??currentBatter.value.player_name}의 타석을 종료하시겠습니까?\n\n주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.`)){
        gameCurrentInfo.value.is_available_stat = false;
        await setCurrentGamedayInfo('lastInfo');
        return;
    }

    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    await setCurrentGamedayInfo('lastInfo');
}

const setTriple = async () => {
    await setCurrentGamedayInfo('hitting');

    if(gameCurrentInfo.value.runner_3b?.player_id){
        await setRunnerAdvanceFromThird()
    }

    if(gameCurrentInfo.value.runner_2b?.player_id){
        await setRunnerAdvanceFromSecond(2)
    }

    if(gameCurrentInfo.value.runner_1b?.player_id){
        await setRunnerAdvanceFromFirst(3)
    }

    await setCurrentGamedayInfo('triple');

    await setBatterGameStats({
        plate_appearances : 1,
        at_bats : 1,
        hits : 1,
        triples : 1,
    });
    await setPitcherGameStats({
        hits_allowed : 1,
        triples_allowed : 1,
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;
    gameCurrentInfo.value.runner_3b = { ...currentBatter.value, pitcher : { ...currentPitcher.value } };
    
    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;

    if(!await confirm(`※ ${currentBatter.value.replaced_player_name??currentBatter.value.player_name}의 타석을 종료하시겠습니까?\n\n주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.`)){
        gameCurrentInfo.value.is_available_stat = false;
        await setCurrentGamedayInfo('lastInfo');
        return;
    }

    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    await setCurrentGamedayInfo('lastInfo');
}

const setHomerun = async () => {
    await setCurrentGamedayInfo('hitting');

    let rbiNum = 1;
    
    if(gameCurrentInfo.value.runner_3b?.player_id){
        rbiNum++;
        await setScore(3,false)
    }
    
    if(gameCurrentInfo.value.runner_2b?.player_id){
        rbiNum++;
        await setScore(2,false)
    }
    
    if(gameCurrentInfo.value.runner_1b?.player_id){
        rbiNum++;
        await setScore(1,false)
    }

    await setScore(4,false)

    await setCurrentGamedayInfo('homerun');

    await setBatterGameStats({
        plate_appearances : 1,
        at_bats : 1,
        hits : 1,
        home_runs : 1,
        runs_batted_in : rbiNum
    });

    await setPitcherGameStats({
        hits_allowed : 1,
        home_runs_allowed : 1,
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;
    gameCurrentInfo.value.runner_1b = null;
    gameCurrentInfo.value.runner_2b = null;
    gameCurrentInfo.value.runner_3b = null;
    
    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;

    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    await setCurrentGamedayInfo('lastInfo');
}

const setBatterAsRunner = async () => {
    if(gameCurrentInfo.value.runner_1b?.player_id) return alert("1루 주자가 있습니다.\n1루 주자를 이동시킨 후 진루를 기록해주세요.","error")
    await setCurrentGamedayInfo('runner:0:1');
    
    gameCurrentInfo.value.runner_1b = { ...currentBatter.value, pitcher : { ... currentPitcher.value } };

    await setCurrentGamedayInfo('lastInfo');
}

const setRunnerAdvanceFromFirst = async (runValue, rbiConfirmYn=true) => {
    if(runValue === null || runValue === undefined) runValue = runner_1b.value;
    
    if(runValue === null || runValue === undefined){
        return alert("주자의 진루 거리를 선택해주세요");
    }

    if(runValue === 1){
        if(gameCurrentInfo.value.runner_2b?.player_id){
            return alert("2루 주자가 있습니다.\n2루 주자를 이동시킨 후 진루를 기록해주세요.","error")
        }
        await setCurrentGamedayInfo('runner:1:2');
        gameCurrentInfo.value.runner_2b = gameCurrentInfo.value.runner_1b;
        gameCurrentInfo.value.runner_1b = null;
    }else if(runValue === 2){
        if(gameCurrentInfo.value.runner_2b?.player_id){
            return alert("2루 주자가 있습니다.\n2루 주자를 이동시킨 후 진루를 기록해주세요.","error")
        }

        if(gameCurrentInfo.value.runner_3b?.player_id){
            return alert("3루 주자가 있습니다.\n3루 주자를 이동시킨 후 진루를 기록해주세요.","error")
        }
        await setCurrentGamedayInfo('runner:1:3');
        gameCurrentInfo.value.runner_3b = gameCurrentInfo.value.runner_1b;
        gameCurrentInfo.value.runner_1b = null;
    }else if(runValue === 3){
        if(gameCurrentInfo.value.runner_2b?.player_id){
            return alert("2루 주자가 있습니다.\n2루 주자를 이동시킨 후 진루를 기록해주세요.","error")
        }

        if(gameCurrentInfo.value.runner_3b?.player_id){
            return alert("3루 주자가 있습니다.\n3루 주자를 이동시킨 후 진루를 기록해주세요.","error")
        }

        await setCurrentGamedayInfo('runner:1:4');
        await setScore(1);
        gameCurrentInfo.value.runner_1b = null;
    }
 
    await setCurrentGamedayInfo('lastInfo');
}

const setRunnerAdvanceFromSecond = async (runValue, rbiConfirmYn=true) => {
    if(runValue === null || runValue === undefined) runValue = runner_2b.value
    
    if(runValue === null || runValue === undefined){
        return alert("주자의 진루 거리를 선택해주세요");
    }

    if(runValue === 1){
        if(gameCurrentInfo.value.runner_3b?.player_id){
            return alert("3루 주자가 있습니다.\n3루 주자를 이동시킨 후 진루를 기록해주세요.","error")
        }
        await setCurrentGamedayInfo('runner:2:3');
        gameCurrentInfo.value.runner_3b = gameCurrentInfo.value.runner_2b;
        gameCurrentInfo.value.runner_2b = null;
    }else if(runValue === 2){
        if(gameCurrentInfo.value.runner_3b?.player_id){
            return alert("3루 주자가 있습니다.\n3루 주자를 이동시킨 후 진루를 기록해주세요.","error")
        }
        await setCurrentGamedayInfo('runner:2:4');
        await setScore(2);
        gameCurrentInfo.value.runner_2b = null;
    }
 
    await setCurrentGamedayInfo('lastInfo');
}

const setRunnerAdvanceFromThird = async (rbiConfirmYn=true) => {
    const runner3B = { ...gameCurrentInfo.value.runner_3b }
    await setCurrentGamedayInfo('runner:3:4');
    await setScore(3,rbiConfirmYn);

    gameCurrentInfo.value.runner_3b = null;
 
    await setCurrentGamedayInfo('lastInfo');
}

const setFlyout = async () => {
    // if(!await confirm("플라이 아웃 기록 시 주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.\n계속하시겠습니까?")) return;

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    await setCurrentGamedayInfo('flyout');
    await setBatterGameStats({
        at_bats : 1,
        plate_appearances : 1,
        flyouts : 1,
    });
    await setPitcherGameStats({
        flyouts : 1,
    });
    
    await setOut();

    await setCurrentGamedayInfo('lastInfo');
}

const setGroundout = async () => {
    // if(!await confirm("땅볼 아웃 기록 시 주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.\n계속하시겠습니까?")) return;

    await setCurrentGamedayInfo('groundout');
    await setBatterGameStats({
        at_bats : 1,
        plate_appearances : 1,
        groundouts : 1,
    });
    await setPitcherGameStats({
        groundouts : 1,
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    await setOut();

    await setCurrentGamedayInfo('lastInfo');
}

const setLinedrive = async () => {
    // if(!await confirm("직선타 기록 시 주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.\n계속하시겠습니까?")) return;

    await setCurrentGamedayInfo('linedrive');
    await setBatterGameStats({
        at_bats : 1,
        plate_appearances : 1,
        linedrives : 1,
    });
    await setPitcherGameStats({
        linedrives : 1,
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    await setOut();

    await setCurrentGamedayInfo('lastInfo');
}

const setFieldersChoice = async () => {
    const options = [
        { id: 'none', name: '없음' },
        ...(gameCurrentInfo.value.runner_1b?.player_id ? [{ id: 1, name: '1루' }] : []),
        ...(gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 2, name: '2루' }] : []),
        ...(gameCurrentInfo.value.runner_3b?.player_id ? [{ id: 3, name: '3루' }] : []),
    ];

    if(options.length === 1) return alert("주자가 없는 경우에 야수 선택이 불가능합니다.", "error");

    let outResult = await prompt(
        '아웃 될 주자를 선택해주세요.',
        '',
        {
            type: 'select',
            options,
            itemValue: 'id',
            itemTitle: 'name',
            rules: [(v) => (v!==null && v!==undefined && ((v.includes('none') && v.length===1) || (!v.includes('none') && v.length>0))) || '아웃 될 주자를 옿바르게 선택해주세요'],
            multiple : true
        }
    );

    if(!outResult) return alert("선택한 내용이 없습니다.","error");

    if(!outResult.includes('none') && outResult.length + gameCurrentInfo.value.out > 2) return alert("가능한 아웃카운트 횟수를 초과했습니다.", "error")
    
    await setCurrentGamedayInfo('hitting');

    if(!outResult.includes('none')){
        for (const base of outResult.toSorted((a, b) => b - a)) {
            await setCurrentGamedayInfo('out:' + base);
            gameCurrentInfo.value['runner_' + base + 'b'] = null;
            await setOut(false,false);
        }
    }

    if(gameCurrentInfo.value.runner_3b?.player_id){
        if(gameCurrentInfo.value.runner_3b?.player_id
            && gameCurrentInfo.value.runner_2b?.player_id
            && gameCurrentInfo.value.runner_1b?.player_id
        ) await setRunnerAdvanceFromThird()
        else{
            const baseResult = await confirm("3루 주자를 홈베이스로 이동시키시겠습니까?");
            if(baseResult) await setRunnerAdvanceFromThird()
        }
    }

    if (gameCurrentInfo.value.runner_2b?.player_id) {
        if (!gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루 비어있고, 1루 있음 → 3루, 홈만 선택 가능
            // 3루 비어있고, 1루 없음 → 2루, 3루, 홈 선택 가능
            const options = [
                ...(!gameCurrentInfo.value.runner_1b?.player_id ? [{ id: 0, name: '2루' }] : []),
                { id: 1, name: '3루' },
                { id: 2, name: '홈' },
            ];

            const baseResult = await prompt(
                '2루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => (v!==undefined && v!==null && v!=='') || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) await setRunnerAdvanceFromSecond(baseResult);
            else await setRunnerAdvanceFromSecond(1)
        }
    }

    if (gameCurrentInfo.value.runner_1b?.player_id) {
        if (gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루에 주자가 있으면 1루 주자는 2루까지만 이동 가능
            await setRunnerAdvanceFromFirst(1);
        } else {
            // 3루에 주자가 없으면 선택 가능: 2루, 3루, 홈
            const options = [
                { id: 1, name: '2루' },
                { id: 2, name: '3루' },
                { id: 3, name: '홈' },
            ];

            const baseResult = await prompt(
                '1루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) await setRunnerAdvanceFromFirst(baseResult);
            else await setRunnerAdvanceFromFirst(1);
        }
    }

    await setCurrentGamedayInfo('fieldersChoice');

    await setBatterGameStats({
        plate_appearances : 1,
        at_bats : 1,
        ...(outResult.includes('none')?{fielders_choice:1}:{})
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;
    gameCurrentInfo.value.runner_1b = { ...currentBatter.value, pitcher : { ...currentPitcher.value } };
    
    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;

    if(!await confirm(`※ ${currentBatter.value.replaced_player_name??currentBatter.value.player_name}의 타석을 종료하시겠습니까?\n\n주자 및 타점 입력이 제한되며,\n다음 타석으로 진행됩니다.`)){
        gameCurrentInfo.value.is_available_stat = false;
        await setCurrentGamedayInfo('lastInfo');
        return;
    }

    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    await setCurrentGamedayInfo('lastInfo');
}

const setDoublePlay = async() => {
    const curOut = gameCurrentInfo.value.out
    if(curOut > 1) return alert("2아웃 이후에는 더블 플레이가 불가능합니다.", "error")

    const options = [
        { id: 0, name: '타자' },
        ...(gameCurrentInfo.value.runner_1b?.player_id ? [{ id: 1, name: '1루' }] : []),
        ...(gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 2, name: '2루' }] : []),
        ...(gameCurrentInfo.value.runner_3b?.player_id ? [{ id: 3, name: '3루' }] : []),
    ];

    const curIsAway = isAway.value;

    let outResult;
    
    if(options.length === 1) return alert("주자가 없는 경우에 더블 플레이가 불가능합니다.", "error");
    else if(options.length === 2){
        outResult = [options[0].id, options[1].id];
    }
    else{
        outResult = await prompt(
            '아웃 될 주자를 선택해주세요.',
            '',
            {
                type: 'select',
                options,
                itemValue: 'id',
                itemTitle: 'name',
                rules: [(v) => (v!==null && v!==undefined && v.length === 2) || '아웃 될 주자를 2명 선택해주세요'],
                multiple : true
            }
        );

        if(!outResult) return alert("아웃 될 주자가 선택되지 않았습니다.","error")
    }
    
    await setCurrentGamedayInfo('doubleplay'); //+Math.min(outResult[0],outResult[1])+":"+Math.max(outResult[0],outResult[1])
    await setBatterGameStats({
        at_bats : 1,
        plate_appearances : 1,
        grounded_into_double_play : 1,
    });
    await setPitcherGameStats({
        grounded_into_double_play : 1,
    });

    if(gameCurrentInfo.value.runner_3b?.player_id){
        if(outResult[0] === 3 || outResult[1] === 3){
            await setCurrentGamedayInfo('out:3');
            gameCurrentInfo.value.runner_3b = null;
            await setOut(false, (curOut!==gameCurrentInfo.value.out?true:false));
        }else{
            const thirdBaseResult = await confirm("3루 주자를 홈베이스로 이동시키시겠습니까?");
            if(thirdBaseResult) await setRunnerAdvanceFromThird()
        }
    }
    
    if (gameCurrentInfo.value.runner_2b?.player_id) {
        if(outResult[0] === 2 || outResult[1] === 2){
            await setCurrentGamedayInfo('out:2');
            gameCurrentInfo.value.runner_2b = null;
            await setOut(false, (curOut!==gameCurrentInfo.value.out?true:false));
        }else{
            if (!gameCurrentInfo.value.runner_3b?.player_id) {
                // 3루 비어있고, 1루 있음 → 3루, 홈만 선택 가능
                // 3루 비어있고, 1루 없음 → 2루, 3루, 홈 선택 가능
                const options = [
                    { id: 0, name: '2루' },
                    { id: 1, name: '3루' },
                    { id: 2, name: '홈' },
                ];

                const baseResult = await prompt(
                    '2루 주자가 이동할 베이스를 선택해주세요.',
                    '',
                    {
                        type: 'select',
                        options,
                        itemValue: 'id',
                        itemTitle: 'name',
                        rules: [(v) => (v!==undefined && v!==null && v!=='') || '이동할 베이스를 선택해주세요'],
                    }
                );

                if (baseResult) await setRunnerAdvanceFromSecond(baseResult);
            }
        }
    }
    
    if (gameCurrentInfo.value.runner_1b?.player_id) {
        if(outResult[0] === 1 || outResult[1] === 1){
            await setCurrentGamedayInfo('out:1');
            gameCurrentInfo.value.runner_1b = null;
            await setOut(false, (curOut!==gameCurrentInfo.value.out?true:false));
        }else{
            const options = [
                { id: 0, name: '1루' },
                ...(!gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 1, name: '2루' }] : []),
                ...(!gameCurrentInfo.value.runner_3b?.player_id || !gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 2, name: '3루' }] : []),
                ...(!gameCurrentInfo.value.runner_3b?.player_id || !gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 3, name: '홈' }] : []),
            ];

            const baseResult = await prompt(
                '1루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) {
                await setRunnerAdvanceFromFirst(baseResult);
            }
        }
    }

    if(outResult[0] !== 0 && outResult[1] !== 0){
        gameCurrentInfo.value.runner_1b = { ...currentBatter.value, pitcher : { ... currentPitcher.value } };
    }else{
        await setCurrentGamedayInfo('out:0');
        await setOut(false, (curOut!==gameCurrentInfo.value.out?true:false));
    }

    if(curIsAway){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    if(curIsAway) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    await setCurrentGamedayInfo('lastInfo');
}

const setTriplePlay = async() => {
    const curOut = gameCurrentInfo.value.out;
    if(gameCurrentInfo.value.out > 0) return alert("아웃 카운트가 있는 경우에에 트리플 플레이가 불가능합니다.", "error");

    const options = [
        { id: 0, name: '타자' },
        ...(gameCurrentInfo.value.runner_1b?.player_id ? [{ id: 1, name: '1루' }] : []),
        ...(gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 2, name: '2루' }] : []),
        ...(gameCurrentInfo.value.runner_3b?.player_id ? [{ id: 3, name: '3루' }] : []),
    ];

    const curIsAway = isAway.value;
    
    let outResult;

    if(options.length < 3) return alert("주자가 2명 미만일 경우에 트리플 플레이가 불가능합니다.", "error");
    else if(options.length === 3){
        outResult = [options[0].id,options[1].id,options[2].id]
    }else{
        outResult = await prompt(
            '아웃 될 주자를 선택해주세요.',
            '',
            {
                type: 'select',
                options,
                itemValue: 'id',
                itemTitle: 'name',
                rules: [(v) => (v!==null && v!==undefined && v.length === 3) || '아웃 될 주자를 3명 선택해주세요'],
                multiple : true
            }
        );

        if(!outResult) return alert("아웃 될 주자가 선택되지 않았습니다.","error")
    }    

    outResult = outResult.toSorted((a,b)=>b-a);

    await setCurrentGamedayInfo('tripleplay');
    await setBatterGameStats({
        at_bats : 1,
        plate_appearances : 1,
        triple_play : 1,
    });
    await setPitcherGameStats({
        triple_play : 1,
    });

    for(let outNum of outResult){
        await setCurrentGamedayInfo('out:'+outNum);
        await setOut(false, (gameCurrentInfo.value.out===2?true:false));
    }

    if(curIsAway){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    if(curIsAway) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;

    await setCurrentGamedayInfo('lastInfo');
}


const setStolenBaseToSecond = async () => {
    if(gameCurrentInfo.value.runner_2b?.player_id) return alert("2루 주자가 있는 경우에는 2루 도루 시도를 할 수 없습니다.", "error");

    await setCurrentGamedayInfo('stolenBase:2');
    await setBatterGameStats({
        stolen_bases : 1,
    },gameCurrentInfo.value.runner_1b.player_id);

    gameCurrentInfo.value.runner_2b = { ...gameCurrentInfo.value.runner_1b };
    gameCurrentInfo.value.runner_1b = null;

    await setCurrentGamedayInfo('lastInfo');
}

const setStolenBaseToThird = async () => {
    if(gameCurrentInfo.value.runner_3b?.player_id) return alert("3루 주자가 있는 경우에는 3루 도루 시도를 할 수 없습니다.", "error");

    await setCurrentGamedayInfo('stolenBase:3');
    await setBatterGameStats({
        stolen_bases : 1,
    },gameCurrentInfo.value.runner_2b.player_id);

    gameCurrentInfo.value.runner_3b = { ...gameCurrentInfo.value.runner_2b };
    gameCurrentInfo.value.runner_2b = null;

    await setCurrentGamedayInfo('lastInfo');
}

const setStolenBaseToHome = async () => {
    await setCurrentGamedayInfo('stolenBase:4');
    await setBatterGameStats({
        stolen_bases : 1,
    },gameCurrentInfo.value.runner_3b.player_id);

    await setScore(3,false);

    gameCurrentInfo.value.runner_3b = null;

    await setCurrentGamedayInfo('lastInfo');
}

const setCaughtStealingSecondBase = async () => {
    if(gameCurrentInfo.value.runner_2b?.player_id) return alert("2루 주자가 있는 경우에는 2루 도루 시도를 할 수 없습니다.", "error");

    await setCurrentGamedayInfo('caughtStealing:2');
    await setBatterGameStats({
        caught_stealings : 1,
    },gameCurrentInfo.value.runner_1b.player_id);

    gameCurrentInfo.value.runner_1b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setCaughtStealingThirdBase = async () => {
    if(gameCurrentInfo.value.runner_3b?.player_id) return alert("3루 주자가 있는 경우에는 3루 도루 시도를 할 수 없습니다.", "error");

    await setCurrentGamedayInfo('caughtStealing:3');
    await setBatterGameStats({
        caught_stealings : 1,
    },gameCurrentInfo.value.runner_2b.player_id);

    gameCurrentInfo.value.runner_2b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setCaughtStealingHomeBase = async () => {
    await setCurrentGamedayInfo('caughtStealing:4');
    await setBatterGameStats({
        caught_stealings : 1,
    },gameCurrentInfo.value.runner_3b.player_id);

    gameCurrentInfo.value.runner_3b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setPickoffFromFirst = async () => {
    await setCurrentGamedayInfo('pickoff:1');
    await setBatterGameStats({
        pickoffs : 1,
    },gameCurrentInfo.value.runner_1b.player_id);

    await setPitcherGameStats({
        pickoffs : 1,
    });

    gameCurrentInfo.value.runner_1b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setPickoffFromSecond = async () => {
    await setCurrentGamedayInfo('pickoff:2');
    await setBatterGameStats({
        pickoffs : 1,
    },gameCurrentInfo.value.runner_2b.player_id);

    await setPitcherGameStats({
        pickoffs : 1,
    });

    gameCurrentInfo.value.runner_2b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setPickoffFromThird = async () => {
    await setCurrentGamedayInfo('pickoff:3');
    await setBatterGameStats({
        pickoffs : 1,
    },gameCurrentInfo.value.runner_3b.player_id);

    await setPitcherGameStats({
        pickoffs : 1,
    });

    gameCurrentInfo.value.runner_3b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setSacrificeFly = async () => {
    if(!gameCurrentInfo.value.runner_3b?.player_id) return alert("3루 주자가 없는 경우에는 희생 플라이를 할 수 없습니다.", "error");
    
    if(gameCurrentInfo.value.out === 2) return alert("2아웃 상황에서는 희생 플라이를 할 수 없습니다.", "error");

    await setCurrentGamedayInfo('sacrificeFly');
    await setCurrentGamedayInfo('rbi');
    await setBatterGameStats({
        plate_appearances : 1,
        sacrifice_flies : 1,
        runs_batted_in : 1
    });

    await setScore(3,false);

    await setOut();

    gameCurrentInfo.value.runner_3b = null;

    await setCurrentGamedayInfo('lastInfo');
}

const setSacrificeBunt = async () => {
    if(gameCurrentInfo.value.out === 2) return alert("2아웃 상황에서는 희생 번트를 할 수 없습니다.", "error");

    if(!gameCurrentInfo.value.runner_1b?.player_id
        && !gameCurrentInfo.value.runner_2b?.player_id
        && !gameCurrentInfo.value.runner_3b?.player_id
    ) return alert("주자가 없으면 희생 번트를 할 수 없습니다.", "error");

    if(gameCurrentInfo.value.runner_3b?.player_id){
        await setRunnerAdvanceFromThird()
    }

    if (gameCurrentInfo.value.runner_2b?.player_id) {
        if (!gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루 비어있고, 1루 있음 → 3루, 홈만 선택 가능
            // 3루 비어있고, 1루 없음 → 2루, 3루, 홈 선택 가능
            const options = [
                { id: 1, name: '3루' },
                { id: 2, name: '홈' },
            ];

            const baseResult = await prompt(
                '2루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => (v!==undefined && v!==null && v!=='') || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) await setRunnerAdvanceFromSecond(baseResult);
        }
    }

    if (gameCurrentInfo.value.runner_1b?.player_id) {
        if(gameCurrentInfo.value.runner_2b?.player_id){
            return alert("2루 주자를 이동시킨 후 희생번트를 기록해주세요.","error");
        }
        if (gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루에 주자가 있으면 1루 주자는 2루까지만 이동 가능
            await setRunnerAdvanceFromFirst(1);
        } else {
            // 3루에 주자가 없으면 선택 가능: 2루, 3루, 홈
            const options = [
                { id: 1, name: '2루' },
                { id: 2, name: '3루' },
                { id: 3, name: '홈' },
            ];

            const baseResult = await prompt(
                '1루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult) {
                await setRunnerAdvanceFromFirst(baseResult);
            }
        }
    }

    await setCurrentGamedayInfo('sacrificeBunt');
    await setBatterGameStats({
        plate_appearances : 1,
        sacrifice_bunts : 1,
    });

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    await setOut()

    await setCurrentGamedayInfo('lastInfo');
}

const setHitByPitch = async () => {
    await setCurrentGamedayInfo('hitByPitch');
    
    await setBatterGameStats({
        plate_appearances : 1,
        hit_by_pitch : 1,
    });
    await setPitcherGameStats({
        hit_by_pitch_allowed : 1,
    });

    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;

    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;
    
    const runner1B = gameCurrentInfo.value.runner_1b;
    const runner2B = gameCurrentInfo.value.runner_2b;
    const runner3B = gameCurrentInfo.value.runner_3b;
    
    //3루 처리
    if(runner1B?.player_id && runner2B?.player_id && runner3B?.player_id){
        await setScore(3, false)

        gameCurrentInfo.value.runner_3b = null;
    }

    //2루처리
    if(runner1B?.player_id && runner2B?.player_id){
        gameCurrentInfo.value.runner_3b = runner2B;
        gameCurrentInfo.value.runner_2b = null;
    }

    //1루처리
    if(runner1B?.player_id){
        gameCurrentInfo.value.runner_2b = runner1B;
        gameCurrentInfo.value.runner_1b = null;
    }

    gameCurrentInfo.value.runner_1b = { ...currentBatter.value, pitcher : { ... currentPitcher.value } };

    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }

    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;
    
    await setCurrentGamedayInfo('lastInfo');
}

const setIntentionalBaseOnBalls = async () => {
    await setCurrentGamedayInfo('intentionalBaseOnBalls');
    
    await setBatterGameStats({
        plate_appearances : 1,
        intentional_base_on_balls : 1,
    });
    await setPitcherGameStats({
        intentional_base_on_balls : 1,
    });

    gameCurrentInfo.value.strike = 0;
    gameCurrentInfo.value.ball = 0;

    if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
    else gameCurrentInfo.value.away_current_pitch_count = 0;
    
    const runner1B = gameCurrentInfo.value.runner_1b;
    const runner2B = gameCurrentInfo.value.runner_2b;
    const runner3B = gameCurrentInfo.value.runner_3b;
    
    //3루 처리
    if(runner1B?.player_id && runner2B?.player_id && runner3B?.player_id){
        await setScore(3, false)

        gameCurrentInfo.value.runner_3b = null;
    }

    //2루처리
    if(runner1B?.player_id && runner2B?.player_id){
        gameCurrentInfo.value.runner_3b = runner2B;
        gameCurrentInfo.value.runner_2b = null;
    }

    //1루처리
    if(runner1B?.player_id){
        gameCurrentInfo.value.runner_2b = runner1B;
        gameCurrentInfo.value.runner_1b = null;
    }

    gameCurrentInfo.value.runner_1b = { ...currentBatter.value, pitcher : { ... currentPitcher.value } };
    
    if(isAway.value) gameCurrentInfo.value.away_batting_number++;
    else gameCurrentInfo.value.home_batting_number++;
    
    await setCurrentGamedayInfo('lastInfo');
}

const setFirstRunnerOut = async () => {
    await setCurrentGamedayInfo('out:1');

    gameCurrentInfo.value.runner_1b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setSecondRunnerOut = async () => {
    await setCurrentGamedayInfo('out:2');

    gameCurrentInfo.value.runner_2b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setThirdRunnerOut = async () => {
    await setCurrentGamedayInfo('out:3');

    gameCurrentInfo.value.runner_3b = null;

    await setOut(false, false);

    await setCurrentGamedayInfo('lastInfo');
}

const setError = async () => {
    if(!errorPlayer.value) return alert("실책한 선수를 선택해주세요.", "error")

    const errorList =   lineupList.value.filter(inning => {
                            const arr = inning[isAway.value?'home':'away'];
                            return arr.length > 0 ? arr[arr.length - 1].player_id === errorPlayer.value : false;
                        })

    const errorInfo = errorList[0][isAway.value?'home':'away']?.[errorList.length - 1]
    
    if(!errorInfo) return alert("실책한 선수 정보가 잘못되었습니다.\n다시 시도해주세요.", "error")

    await setCurrentGamedayInfo(`error:${errorInfo.replaced_position??errorInfo.position}`);

    await setBatterGameStats({
        errors : 1,
    },errorInfo.player_id);

    await setCurrentGamedayInfo('lastInfo');

    errorPlayer.value = null
}

const setWildPitch = async () => {
    if(gameCurrentInfo.value.ball === 3) return alert("3볼에서는 폭투처리를 할 수 없습니다.\n볼 처리를 해주세요.", "error");

    let runnerMoveNum = 0;

    if(gameCurrentInfo.value.runner_3b?.player_id){
        if(gameCurrentInfo.value.runner_3b?.player_id
            && gameCurrentInfo.value.runner_2b?.player_id
            && gameCurrentInfo.value.runner_1b?.player_id
        ){
            await setRunnerAdvanceFromThird(false)
            runnerMoveNum++;
        }
        else{
            const baseResult = await confirm("3루 주자를 홈베이스로 이동시키시겠습니까?");

            if(baseResult){
                await setRunnerAdvanceFromThird(false)
                runnerMoveNum++;
            }
        }
    }

    if (gameCurrentInfo.value.runner_2b?.player_id) {
        if (!gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루 비어있고, 1루 있음 → 3루, 홈만 선택 가능
            // 3루 비어있고, 1루 없음 → 2루, 3루, 홈 선택 가능
            const options = [
                { id: 0, name: '2루' },
                { id: 1, name: '3루' },
                { id: 2, name: '홈' },
            ];

            const baseResult = await prompt(
                '2루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => (v!==undefined && v!==null && v!=='') || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult){
                await setRunnerAdvanceFromSecond(baseResult, false);
                runnerMoveNum++;
            }
        }
    }

    if (gameCurrentInfo.value.runner_1b?.player_id) {
        if (!gameCurrentInfo.value.runner_2b?.player_id) {
            // 3루에 주자가 없으면 선택 가능: 2루, 3루, 홈
            const options = [
                { id: 0, name: '1루' },
                ...(!gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 1, name: '2루' }] : []),
                ...(!gameCurrentInfo.value.runner_2b?.player_id && !gameCurrentInfo.value.runner_3b?.player_id ? [{ id: 2, name: '3루' }] : []),
                ...(!gameCurrentInfo.value.runner_2b?.player_id && !gameCurrentInfo.value.runner_3b?.player_id ? [{ id: 3, name: '홈' }] : []),
            ];

            const baseResult = await prompt(
                '1루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult){
                await setRunnerAdvanceFromFirst(baseResult, false);
                runnerMoveNum++;
            }
        }
    }

    if(runnerMoveNum === 0) return alert("주자가 이동하지 않으면 폭투처리를 할 수 없습니다.","error");

    await setCurrentGamedayInfo(`wildPitch`);
    await setCurrentGamedayInfo(`ball`);

    await setPitcherGameStats({
        wild_pitches : 1,
    });

    const current_ball = gameCurrentInfo.value.ball;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_ball<3){
        gameCurrentInfo.value.ball++;
    }

    await setCurrentGamedayInfo('lastInfo');
}

const setPassedBall = async () => {
    if(gameCurrentInfo.value.ball === 3) return alert("3볼에서는 포일처리를 할 수 없습니다.\n볼 처리를 해주세요.", "error");

    let runnerMoveNum = 0;

    if(gameCurrentInfo.value.runner_3b?.player_id){
        if(gameCurrentInfo.value.runner_3b?.player_id
            && gameCurrentInfo.value.runner_2b?.player_id
            && gameCurrentInfo.value.runner_1b?.player_id
        ){
            await setRunnerAdvanceFromThird(false)
            runnerMoveNum++;
        }
        else{
            const baseResult = await confirm("3루 주자를 홈베이스로 이동시키시겠습니까?");

            if(baseResult){
                await setRunnerAdvanceFromThird(false)
                runnerMoveNum++;
            }
        }
    }

    if (gameCurrentInfo.value.runner_2b?.player_id) {
        if (!gameCurrentInfo.value.runner_3b?.player_id) {
            // 3루 비어있고, 1루 있음 → 3루, 홈만 선택 가능
            // 3루 비어있고, 1루 없음 → 2루, 3루, 홈 선택 가능
            const options = [
                { id: 0, name: '2루' },
                { id: 1, name: '3루' },
                { id: 2, name: '홈' },
            ];

            const baseResult = await prompt(
                '2루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => (v!==undefined && v!==null && v!=='') || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult){
                await setRunnerAdvanceFromSecond(baseResult, false);
                runnerMoveNum++;
            }
        }
    }

    if (gameCurrentInfo.value.runner_1b?.player_id) {
        if (!gameCurrentInfo.value.runner_2b?.player_id) {
            // 3루에 주자가 없으면 선택 가능: 2루, 3루, 홈
            const options = [
                { id: 0, name: '1루' },
                ...(!gameCurrentInfo.value.runner_2b?.player_id ? [{ id: 1, name: '2루' }] : []),
                ...(!gameCurrentInfo.value.runner_2b?.player_id && !gameCurrentInfo.value.runner_3b?.player_id ? [{ id: 2, name: '3루' }] : []),
                ...(!gameCurrentInfo.value.runner_2b?.player_id && !gameCurrentInfo.value.runner_3b?.player_id ? [{ id: 3, name: '홈' }] : []),
            ];

            const baseResult = await prompt(
                '1루 주자가 이동할 베이스를 선택해주세요.',
                '',
                {
                    type: 'select',
                    options,
                    itemValue: 'id',
                    itemTitle: 'name',
                    rules: [(v) => !!v || '이동할 베이스를 선택해주세요'],
                }
            );

            if (baseResult){
                await setRunnerAdvanceFromFirst(baseResult, false);
                runnerMoveNum++;
            }
        }
    }

    if(runnerMoveNum === 0) return alert("주자가 이동하지 않으면 포일처리를 할 수 없습니다.","error");

    await setCurrentGamedayInfo(`passedBall`);
    await setCurrentGamedayInfo(`ball`);

    const current_ball = gameCurrentInfo.value.ball;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    
    if(current_ball<3){
        gameCurrentInfo.value.ball++;
    }

    await setCurrentGamedayInfo('lastInfo');
}

const setBalk = async () => {
    await setCurrentGamedayInfo('balk');

    if (gameCurrentInfo.value.runner_3b?.player_id) await setRunnerAdvanceFromThird(false)
    if (gameCurrentInfo.value.runner_2b?.player_id) await setRunnerAdvanceFromSecond(1, false);
    if (gameCurrentInfo.value.runner_1b?.player_id) await setRunnerAdvanceFromFirst(1, false);

    await setCurrentGamedayInfo('lastInfo');
}

onMounted(async ()=>{
    await updateMatchups(selectedDate.value);
})
</script>

<style scoped>
:deep(.selected .v-list-item__overlay){
    background-color: currentColor;
    opacity: var(--v-selected-opacity);
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
</style>