import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20,                        // 최대 연결 수: 동시에 처리할 수 있는 DB 연결의 최대 개수를 설정합니다.
  idleTimeoutMillis: 30000,       // 유휴 연결 타임아웃: 사용되지 않는 연결을 얼마나 오래 유지할지 설정합니다. (ms)
  connectionTimeoutMillis: 2000,  // 연결 시도 타임아웃: 풀에서 연결을 가져오는 데 걸리는 최대 시간입니다. (ms)
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * 공통 DB 쿼리 함수
 * @param {string} text - SQL 쿼리문
 * @param {Array} params - 쿼리 파라미터
 */
export const query = async (text, params) => {
    const client = await pool.connect()
    try {
        const res = await client.query(text, params)
        return res
    } catch (err) {
        console.error('DB Query Error:', err)
        throw err
    } finally {
        client.release()
    }
}

export default pool;