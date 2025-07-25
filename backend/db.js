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
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
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
    let client;
    try {
        client = await pool.connect();
        const res = await client.query(text, params);
        return res;
    } catch (err) {
        console.error('DB Query Error:', err);
        throw err;
    } finally {
        if (client) client.release();
    }
};

/**
 * 트랜잭션 래퍼 함수
 * @param {Function} callback - client를 인자로 받는 async 함수
 * @returns {*} callback의 실행 결과
 */
export const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Transaction Error:', err);
        throw err;
    } finally {
        client.release();
    }
};

export default pool;
