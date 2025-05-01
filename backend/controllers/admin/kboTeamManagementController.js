import { query, withTransaction } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'
import { encryptData, decryptData } from '../../utils/crypto.js';

export const getKboTeamList = async (req, res) => {
    try {
        const kboTeamList = await query(`
            SELECT
                *
            FROM team_master
            ORDER BY status, founding_year, disband_year, id
        `,[])

        if(kboTeamList.rows.length>0) 
            return sendSuccess(res, {
                message : "팀 목록을 성공적으로 조회하였습니다.",
                teamList : kboTeamList.rows
            })
        else return sendBadRequest(res, "팀 목록 조회 중 문제가 발생하였습니다.")
    } catch (error) {
        return sendServerError(res, error, '팀 목록 조회 중 문제가 발생하였습니다. 다시 시도해주세요.');
    }
}

export const createKboTeam = async (req, res) => {
    const { name, code, founding_year, logo_url, status, disband_year } = req.body;

    // 필수값 확인
    if (!name || !code || !founding_year || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    // status 값 유효성 확인
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
        return sendBadRequest(res, "status 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            // 중복 코드 확인
            const { rows: existing } = await client.query(
                'SELECT 1 FROM team_master WHERE code = $1',
                [code]
            );
            if (existing.length > 0) {
                return sendBadRequest(res, "이미 존재하는 팀 코드입니다.");
            }

            // INSERT 쿼리 실행
            const insertQuery = `
                INSERT INTO team_master (name, code, founding_year, logo_url, status, disband_year)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const values = [name, code, founding_year, logo_url || null, status, disband_year || null];

            const { rows } = await client.query(insertQuery, values);

            return sendSuccess(res, rows[0], "팀이 성공적으로 생성되었습니다.");
        });
    } catch (error) {
        return sendServerError(res, error, "팀 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
};

export const updateKboTeam = async (req, res) => {
    const { name, code, founding_year, logo_url, status, disband_year } = req.body;

    let { teamId } = req.params;
    
    teamId = decryptData(teamId)

    if(!teamId){
        return sendBadRequest(res, "팀 정보가 잘못되었습니다.");
    }

    // 필수값 확인
    if (!teamId || !name || !code || !founding_year || !status) {
        return sendBadRequest(res, "필수 입력값을 모두 입력해주세요.");
    }

    // status 값 유효성 확인
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
        return sendBadRequest(res, "status 값이 올바르지 않습니다.");
    }

    try {
        await withTransaction(async (client) => {
            // 중복 코드 확인
            const { rows: existing } = await client.query(
                'SELECT id FROM team_master WHERE code = $1',
                [code]
            );
            
            if (existing.length > 0 && existing.find((row)=>row.id !== teamId)) {
                return sendBadRequest(res, "이미 존재하는 팀 코드입니다.");
            }

            // UPDATE 쿼리 실행
            const updateQuery = `
                UPDATE team_master SET
                    name = $2
                    , code = $3
                    , founding_year = $4
                    , logo_url = $5
                    , status = $6
                    , disband_year = $7
                where id = $1
            `;
            const params = [teamId, name, code, founding_year, logo_url || null, status, disband_year || null];
            console.log(params)
            await client.query(updateQuery, params);

            return sendSuccess(res, "팀이 성공적으로 수정되었습니다.");
        });
    } catch (error) {
        return sendServerError(res, error, "팀 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

export const getKboTeamDetail = async (req, res) => {
    let { teamId } = req.params;
    
    teamId = decryptData(teamId)

    if(!teamId){
        return sendBadRequest(res, "팀 정보가 잘못되었습니다.");
    }

    try {
        let teamInfoQuery = `
            SELECT
                *
            FROM team_master tm
            WHERE tm.id = $1
        `;

        const param = [teamId];

        const teamInfo = await query(teamInfoQuery, param);
        
        if(!teamInfo.rows[0])
            return sendBadRequest(res, '팀 정보가 없습니다.');

        return sendSuccess(res, {
            message: '팀 정보가 조회되었습니다.',
            teamInfo : teamInfo.rows[0]
        });
    } catch (error) {
        return sendServerError(res, error, '팀 정보 조회 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}