export const LEAGUE_TYPES = [
    {
        id: 'head2head',
        label: '헤드 투 헤드',
        description: '매주 매치업을 통해 승패를 겨루는 방식',
    },
    {
        id: 'season',
        label: '시즌 누적',
        description: '시즌 전체 스탯을 누적하여 승부',
    },
];

export const LEAGUE_FORMATS = [
    {
        id: 'h2h-category',
        type: 'head2head',
        label: '일반',
        description: '주간 스탯 승수를 비교하여 승리',
    },
    {
        id: 'h2h-points',
        type: 'head2head',
        label: '포인트제',
        description: '스탯마다 포인트를 설정해 총합으로 승부',
    },
    {
        id: 'h2h-roto',
        type: 'head2head',
        label: '로티서리',
        description: '주간 순위를 기준으로 점수를 부여',
    },
    {
        id: 'season-points',
        type: 'season',
        label: '포인트제',
        description: '시즌 전체 포인트 누적으로 경쟁',
    },
    {
        id: 'season-roto',
        type: 'season',
        label: '로티서리',
        description: '시즌 전체 스탯 순위로 점수를 부여',
    },
];

export const DRAFT_METHODS = [
    {
        id: 'snake',
        label: '스네이크',
        description: '라운드마다 순서가 반대로 바뀌는 방식',
    },
    {
        id: 'linear',
        label: '리니어',
        description: '모든 라운드에서 같은 순서로 선택',
    },
    {
        id: 'auction',
        label: '옥션',
        description: '경매 방식으로 선수 선택',
    },
    {
        id: 'custom',
        label: '사용자 설정',
        description: '커미셔너가 직접 각 팀의 선수를 지정',
    }
]

export const TRANSACTION_TYPE = [
  { id: 'add', label: '선수 추가' },
  { id: 'drop', label: '선수 드랍' },
  { id: 'waiver_add', label: '웨이버 추가' },
  { id: 'drafted', label: '드래프트' },
  { id: 'trade', label: '트레이드' }
];