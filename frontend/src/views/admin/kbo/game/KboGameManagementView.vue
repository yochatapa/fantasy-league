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
                                        outlined
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
                            <baseball-stadium></baseball-stadium>
                            <div class="chip-container mt-2">
                                <div class="d-flex" style="gap: 4px; overflow-x: auto; white-space: nowrap;">
                                    <v-chip
                                        v-for="number in 12"
                                        :key="number"
                                        class="d-flex justify-center align-center cursor-pointer"
                                        size="small"
                                        :variant="number === 1 ? 'tonal' : 'text'"
                                    >
                                        {{ number }}회
                                    </v-chip>
                                </div>

                                <!-- 아래의 내용 영역 -->
                                <v-card class="content-card mt-3" elevation="2">
                                    <div class="content-wrapper">
                                        <!-- {{  console.log(JSON.stringify(gamedayInfo))??'' }} -->
                                        <div v-for="(inningInfo, topBottom) in gamedayInfo[gameCurrentInfo.inning]" class="w-100">
                                            <div>
                                                <span>{{gameCurrentInfo.inning}}회 {{ topBottom==='top'?"초":"말" }}</span>
                                            </div>
                                            <div v-for="(outInfo, outcount) in inningInfo">
                                                <div>
                                                    <br>
                                                    <span>타자 : {{ outInfo[0]?.batter?.replaced_player_name??outInfo[0]?.batter?.player_name }}</span>
                                                    <br>
                                                    <span>투수 : {{ outInfo[0]?.pitcher?.replaced_player_name??outInfo[0]?.pitcher?.player_name }}</span>
                                                </div>
                                                <br>
                                                <div v-for="(ballInfo, index) in outInfo">
                                                    <div v-if="['strike','ball','foul'].includes(ballInfo.type)">
                                                        {{ ballInfo[topBottom==='top'?'home_current_pitch_count':'away_current_pitch_count'] }}구 : {{ ballInfo.type==='strike'?'스트라이크':(ballInfo.type==='ball'?'볼':(ballInfo.type==='foul'?'파울':'')) }}
                                                    </div>
                                                    <div v-else-if="['out'].includes(ballInfo.type)">
                                                        아웃
                                                    </div>
                                                    <div v-else-if="['baseonballs'].includes(ballInfo.type)">
                                                        볼넷
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
                        <v-card-text>
                            <v-row>
                                <v-col cols="12">
                                    <span class="text-h6 font-semibold">턴 정보</span>
                                </v-col>
                                <!-- 이닝 선택 -->
                                <v-col cols="12" md="4">
                                    <v-select
                                        v-model="gameCurrentInfo.inning"
                                        :items="innings"
                                        label="이닝"
                                        :rules="[v => !!v || '이닝을 선택해 주세요.']"
                                        required
                                    />
                                </v-col>

                                <!-- 이닝 구분 선택 -->
                                <v-col cols="12" md="4">
                                    <v-select
                                        v-model="gameCurrentInfo.inning_half"
                                        :items="inning_half"
                                        label="이닝 구분"
                                        :rules="[v => !!v || '이닝 구분을 선택해 주세요.']"
                                        item-value="code"
                                        item-title="name"
                                        required
                                    />
                                </v-col>

                                <!-- 아웃 카운트 선택 -->
                                <v-col cols="12" md="4">
                                    <v-select
                                        v-model="gameCurrentInfo.out"
                                        :items="outs"
                                        label="아웃 카운트"
                                        :rules="[v => (v!==null && v!==undefined) || '아웃 카운트를 선택해 주세요.']"
                                        required
                                    />
                                </v-col>

                                <v-col cols="12">
                                    <v-chip-group column class="mb-4">
                                        <v-chip>안타</v-chip>
                                        <v-chip>2루타</v-chip>
                                        <v-chip>3루타</v-chip>
                                        <v-chip>홈런</v-chip>
                                        <v-chip>사구</v-chip>
                                        <v-chip>고의사구</v-chip>
                                        <v-chip>플라이 아웃</v-chip>
                                        <v-chip>땅볼 아웃</v-chip>
                                        <v-chip>더블 플레이</v-chip>
                                        <v-chip>트리플 플레이</v-chip>
                                        <v-chip>희생플라이</v-chip>
                                        <v-chip>희생번트</v-chip>
                                    </v-chip-group>
                                </v-col>
                                <v-divider></v-divider>
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                    <div class="mb-3">
                                        <span class="text-h6 font-semibold">투구 정보</span>
                                    </div>
                                    <div class="mb-3">
                                        <div class="text-lg font-bold">볼 : {{ gameCurrentInfo.ball }}</div>
                                        <div class="text-lg font-bold">스트라이크 : {{ gameCurrentInfo.strike }}</div>
                                        <div class="text-lg font-bold">투구수 : {{ gameCurrentInfo.pitch_count }}구</div>
                                    </div>
                                    <v-chip-group column class="mt-2" >
                                        <v-chip @click="setStrike">스트라이크</v-chip>
                                        <v-chip @click="setBall">볼</v-chip>
                                        <v-chip @click="setFoul">파울</v-chip>
                                    </v-chip-group>
                                </v-col>
                                <v-divider></v-divider>
                            </v-row>
                            <v-row class="py-2">
                                <v-col cols="12" md="6">
                                    <div class="mb-3">
                                        <span class="text-h6 font-semibold">타자 정보</span>
                                    </div>
                                    <div class="text-lg font-bold">{{ currentBatter.player_name }}</div>
                                    <div class="text-sm text-secondary">{{ currentBatter.team_name }}</div>
                                    <div class="text-sm mt-1">
                                        타순: {{ currentBatter.batting_order }}번 | 포지션: {{ currentBatter.position }}
                                    </div>

                                    <!-- 기록 표시 -->
                                    <v-chip-group column class="mt-2">
                                        <div class="d-flex" style="gap:8px">
                                            <v-select
                                                density="compact"
                                            ></v-select>
                                            <v-chip class="d-flex align-center justift-center">
                                                타점
                                            </v-chip>
                                        </div>
                                    </v-chip-group>
                                </v-col>
                                
                                <v-col cols="12" md="6">
                                    <div class="mb-3">
                                        <span class="text-h6 font-semibold">투수 정보</span>
                                    </div>
                                    <div class="text-lg font-bold">{{ currentPitcher.replaced_player_name??currentPitcher.player_name }}</div>
                                    <div class="text-sm text-secondary">{{ currentPitcher.team_name }}</div>
                                    <div class="text-sm mt-1">
                                        포지션: {{ currentPitcher.replaced_position??currentPitcher.position }}
                                    </div>

                                    <!-- 기록 표시 -->
                                    <v-chip-group multiple column class="mt-2">
                                        <v-chip>폭투</v-chip>
                                        <v-chip>패스트볼</v-chip>
                                        <v-chip>인터페어런스</v-chip>
                                        <v-chip>보크</v-chip>
                                    </v-chip-group>
                                </v-col>

                                <v-divider></v-divider>
                                
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                    <div class="mb-3">
                                        <span class="text-h6 font-semibold">주자 정보</span>
                                    </div>
                                    <div v-for="(runner, index) in gameCurrentInfo.runner">
                                        <div v-if="runner">
                                            {{ index }}루 주자 : {{ runner.player_name }}
                                            <!-- 기록 표시 -->
                                            <v-chip-group multiple column class="mt-2" >
                                                <v-chip>도루</v-chip>
                                                <v-chip>1베이스 진루</v-chip>
                                                <v-chip>2베이스 진루</v-chip>
                                                <v-chip>3베이스 진루</v-chip>
                                                <v-chip>견제사</v-chip>
                                                <v-chip>아웃</v-chip>
                                            </v-chip-group>
                                        </div>
                                    </div>
                                </v-col>
                                <v-divider></v-divider>
                            </v-row>           
                            <v-row>
                                <div class="d-flex" style="gap:8px">
                                    <v-select
                                        density="compact"
                                    ></v-select>
                                    <v-chip class="d-flex align-center justift-center">
                                        실책
                                    </v-chip>
                                </div>
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

                                            <!-- 이닝 선택 -->
                                            <v-col cols="12" md="3">
                                                <v-select
                                                    v-model="lineup.replaced_inning"
                                                    :items="innings"
                                                    label="이닝"
                                                    :rules="[v => !!v || '이닝을 선택해 주세요.']"
                                                    required
                                                />
                                            </v-col>

                                            <!-- 아웃 카운트 선택 -->
                                            <v-col cols="12" md="3">
                                                <v-select
                                                    v-model="lineup.replaced_out"
                                                    :items="outs"
                                                    label="아웃 카운트"
                                                    :rules="[v => (v!==null && v!==undefined) || '아웃 카운트를 선택해 주세요.']"
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
import { ref, computed, watch, onMounted } from 'vue';
import { STADIUMS, POSITIONS, GAME_STATUS } from '@/utils/code/code.js';
import { commonFetch, getNewFormData } from '@/utils/common/commonFetch';
import { formatDate } from '@/utils/common/dateUtils.js';
import { encryptData, decryptData } from '@/utils/common/crypto.js';
import BaseballStadium from '@/components/kbo/BaseballStadium.vue';
import { useRouter, useRoute } from 'vue-router';

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

const teamList = ref([]);
const gameList = ref([]);
const lineupList = ref(new Array(10).fill(null).map(() => ({ away: [], home: [] })))
const awayTeamInfo = ref([]);
const homeTeamInfo = ref([]);
const awayTeamRosterInfo = ref([]);
const homeTeamRosterInfo = ref([]);
const activeRoster = ref([])

const activeTab = ref(0);

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
                lineup.value.replaced_inning!== null && lineup.value.replaced_inning!== undefined &&
                lineup.value.replaced_out   !== null && lineup.value.replaced_out   !== undefined &&
                lineup.value.position       !== null && lineup.value.position       !== undefined
    }
});
const lineup = ref({
    team_id: null,
    player_id: null,
    replaced_by: null,
    batting_order: null,
    replaced_inning: null,
    replaced_out: null,
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
    runner : {
        1 : null,
        2 : null,
        3 : null,
    },
});

const isAway = computed(()=>gameCurrentInfo.value.inning_half === 'top');

const currentBatter = computed(()=>{
    const awayHome = isAway.value?'away':'home';
    const battingOrderInfo = lineupList.value[(gameCurrentInfo.value[awayHome + '_batting_number'] % 9) + 1]?.[awayHome];
    const lastBatterInfo = battingOrderInfo?.[(battingOrderInfo?.length??1)-1]
    return lastBatterInfo
})

const currentPitcher = computed(()=>{
    const awayHome = isAway.value?'home':'away';
    const pitcherOrderInfo = lineupList.value[0]?.[awayHome];
    const lastPitcherInfo = pitcherOrderInfo?.[(pitcherOrderInfo?.length??1)-1]
    return lastPitcherInfo
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
        replaced_out: null,
        replaced_position : null,
        position : null,
    }

    selectedLineup.value = [null,null];
}

const getGameDetailInfo = async (game_id) => {
    try {
        lineupList.value = new Array(10).fill(null).map(() => ({ away: [], home: [] }));
        clearLineup();
        const response = await commonFetch(`/api/admin/game/${game_id}`)
        
        if(response.success){
            awayTeamInfo.value = response.data.awayTeamInfo
            homeTeamInfo.value = response.data.homeTeamInfo
            selectedMatchup.value = response.data.gameInfo
            await getRosterDetailInfo(selectedMatchup.value.away_team_id,selectedMatchup.value.home_team_id);
        }else{
            awayTeamInfo.value = [];
            homeTeamInfo.value = [];
            selectedMatchup.value = null;
            throw new Error();
        }

        return true
    } catch (error) {
        
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

const setPlayerInfo = (teamFlag, orderIndex, replaceIndex) => {
    const playerInfo = lineupList.value[((orderIndex + 1)%10)]?.[teamFlag]?.[replaceIndex];
    
    if(!playerInfo) return;

    lineup.value = {
        team_id: playerInfo.team_id,
        player_id: null,
        replaced_by: null,
        batting_order: playerInfo.batting_order,
        replaced_inning: null,
        replaced_out: null,
        replaced_position : null,
        position : null,
    }

    selectedLineup.value = [teamFlag,orderIndex]
}

const setCurrentGamedayInfo = (type) => {
    if(!!!gamedayInfo.value[gameCurrentInfo.value.inning]) gamedayInfo.value[gameCurrentInfo.value.inning] = {}
    if(!!!gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half]) gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half] = {}
    if(!!!gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half][isAway.value?gameCurrentInfo.value.away_batting_number:gameCurrentInfo.value.home_batting_number]){
        gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half][isAway.value?gameCurrentInfo.value.away_batting_number:gameCurrentInfo.value.home_batting_number] = [
            { batter : {...currentBatter.value}, pitcher : {...currentPitcher.value}, type:'startInfo' },
        ];
    }
    
    
    gamedayInfo.value[gameCurrentInfo.value.inning][gameCurrentInfo.value.inning_half][isAway.value?gameCurrentInfo.value.away_batting_number:gameCurrentInfo.value.home_batting_number].push({...gameCurrentInfo.value, batter: {...currentBatter.value}, pitcher : {...currentPitcher.value}, type:type})
}

const setStrike = () => {
    const current_strike = gameCurrentInfo.value.strike;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    setCurrentGamedayInfo('strike');
    if(current_strike<2) gameCurrentInfo.value.strike++;
    else{
        setCurrentGamedayInfo('out');
        gameCurrentInfo.value.strike = 0;
        gameCurrentInfo.value.ball = 0;
        if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
        else gameCurrentInfo.value.away_current_pitch_count = 0;

        if(isAway.value) gameCurrentInfo.value.away_batting_number++;
        else gameCurrentInfo.value.home_batting_number++;
        
        const current_out = gameCurrentInfo.value.out;
        
        if(current_out<2) gameCurrentInfo.value.out++;
        else{
            gameCurrentInfo.value.out = 0;
            const current_inning_half = gameCurrentInfo.value.inning_half;
            gameCurrentInfo.value.runner = [];
            if(current_inning_half === "top") gameCurrentInfo.value.inning_half = "bottom"
            else {
                gameCurrentInfo.value.inning++;
                gameCurrentInfo.value.inning_half = "top"
            }
        }
    }
}

const setBall = () => {
    const current_ball = gameCurrentInfo.value.ball;
    if(isAway.value){
        gameCurrentInfo.value.home_pitch_count++;
        gameCurrentInfo.value.home_current_pitch_count++;
    }
    else{
        gameCurrentInfo.value.away_pitch_count++;
        gameCurrentInfo.value.away_current_pitch_count++;
    }
    setCurrentGamedayInfo('ball');
    if(current_ball<3) gameCurrentInfo.value.ball++;
    else{
        gameCurrentInfo.value.strike = 0;
        gameCurrentInfo.value.ball = 0;
        setCurrentGamedayInfo('baseonballs');

        if(isAway.value) gameCurrentInfo.value.home_current_pitch_count = 0;
        else gameCurrentInfo.value.away_current_pitch_count = 0;

        const current_inning_half = gameCurrentInfo.value.inning_half;
        // 주자 처리 필요
        
        const runner1B = gameCurrentInfo.value.runner[1];
        const runner2B = gameCurrentInfo.value.runner[2];
        const runner3B = gameCurrentInfo.value.runner[3];

        //3루 처리
        if(runner1B && runner2B && runner3B){
            if(current_inning_half === "top") gameCurrentInfo.value.away_score++;
            else gameCurrentInfo.value.home_score++;

            gameCurrentInfo.value.runner[3] = null;
        }

        //2루처리
        if(runner1B && runner2B){
            gameCurrentInfo.value.runner[3] = runner2B;
            gameCurrentInfo.value.runner[2] = null;
        }

        //1루처리
        if(runner1B && runner1B){
            gameCurrentInfo.value.runner[2] = runner1B;
            gameCurrentInfo.value.runner[1] = null;
        }

        gameCurrentInfo.value.runner[1] = currentBatter.value;
        if(isAway.value) gameCurrentInfo.value.away_batting_number++;
        else gameCurrentInfo.value.home_batting_number++;
    }
    
}

const setFoul = () => {
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

    setCurrentGamedayInfo('foul');
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