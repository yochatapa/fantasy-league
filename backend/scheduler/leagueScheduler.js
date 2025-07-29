import schedule from 'node-schedule';
import { query, withTransaction } from '../db.js'; // DB 연결 모듈
import dayjs from 'dayjs'
import { getIO } from '../utils/socket.js';
import { encryptData, decryptData } from '../utils/crypto.js';

// --- 시즌 시작 스케줄러: 매일 자정 (새벽 0시 0분 0초)에 실행 ---
const startLeagueSeasonJob = schedule.scheduleJob('0 0 0 * * *', async () => {
    const now = dayjs(); // 현재 시각
    const today = now.format('YYYY-MM-DD'); // 오늘 날짜 (YYYY-MM-DD 형식)

    console.log(`[시즌 시작 스케줄러] 실행 시작: ${now.format('YYYY-MM-DD HH:mm:ss')}`);

    try {
        await withTransaction(async (client) => {
            // 1. 'pending' 상태이며, start_date가 오늘(today)과 같거나 이전인 리그 시즌을 조회합니다.
            //    start_date는 드래프트 완료 시 실제 리그 시작일로 업데이트된 값입니다.
            const { rows: readyToStartSeasons } = await client.query(`
                SELECT
                    ls.season_id,
                    ls.league_id,
                    ls.season_year,
                    ls.start_date
                FROM public.league_season ls
                WHERE ls.season_status = 'pending'
                AND ls.start_date <= $1::date
            `, [today]); // PostgreSQL DATE 타입에 맞게 today를 전달

            if (readyToStartSeasons.length === 0) {
                console.log(`[시즌 시작 스케줄러] 오늘 날짜(${today}) 기준으로 시작할 리그 시즌이 없습니다.`);
                return; // 시작할 시즌이 없으면 종료
            }

            console.log(`[시즌 시작 스케줄러] 시작할 리그 시즌 ${readyToStartSeasons.length}개 발견.`);

            for (const season of readyToStartSeasons) {
                console.log(`[시즌 시작 스케줄러] 리그 시즌 시작 처리 중: League ID=${season.league_id}, Season ID=${season.season_id}, Season Year=${season.season_year}`);

                // 2. 시즌 상태를 'active'로 업데이트
                await client.query(`
                    UPDATE public.league_season
                    SET season_status = 'active', updated_at = CURRENT_TIMESTAMP
                    WHERE league_id = $1 AND season_id = $2
                `, [season.league_id, season.season_id]);

                console.log(`✅ 리그 시즌 활성화됨: League ID=${season.league_id}, Season ID=${season.season_id}`);

                // 3. (선택 사항) 리그 시작 시 필요한 추가 로직 트리거
                //    예: 해당 시즌의 첫 주차 경기 생성, 초기 통계 설정 등
                //    이 부분은 비즈니스 요구사항에 따라 달라질 수 있습니다.
                //    예시: await createInitialMatchesForSeason(season.league_id, season.season_id);
                //    예시: emitLeagueStartedEvent(season.league_id, season.season_id);
            }
        });
        console.log(`[시즌 시작 스케줄러] 실행 완료.`);

    } catch (error) {
        console.error('❌ 시즌 시작 스케줄러 실행 중 에러:', error);
    }
});