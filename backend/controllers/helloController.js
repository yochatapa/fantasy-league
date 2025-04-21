// controllers/helloController.ts
import pg from 'pg'; // pg를 기본 내보내기로 가져옴
const { Client } = pg; // Client를 분리해서 가져옴

export const getHelloMessage = async (req, res) => {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 5432, // PostgreSQL 기본 포트
  });

  try {
    // DB 연결 시도
    await client.connect();

    // 쿼리 실행 (테스트용 쿼리)
    const result = await client.query('SELECT NOW()');

    // 성공적인 쿼리 결과 처리
    res.json({ message: 'DB connection success!', time: result.rows[0] });
  } catch (error) {
    console.error('DB connection error:', error);
    // DB 연결 실패 처리
    res.status(500).json({ message: 'DB connection failed!', error });
  } finally {
    // DB 연결 종료
    await client.end();
  }
};