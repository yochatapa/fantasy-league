import { query, withTransaction } from '../../db.js'
import { sendSuccess, sendBadRequest, sendServerError } from '../../utils/apiResponse.js'

export const getKboTeamList = async (req, res) => {
    try {
        const kboTeamList = await query(`
            SELECT
                *
            FROM team_master
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
