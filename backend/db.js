import { Client } from 'pg';  // pg에서 Client를 불러옵니다.
import dotenv from 'dotenv';  // dotenv를 사용해 .env 파일에서 환경 변수를 로드합니다.

dotenv.config();  // .env 파일을 로드합니다.

const client = new Client({
  user: process.env.DB_USER,  // .env 파일에서 사용자 이름을 가져옵니다.
  host: process.env.DB_HOST,  // .env 파일에서 호스트를 가져옵니다.
  database: process.env.DB_NAME,  // .env 파일에서 데이터베이스 이름을 가져옵니다.
  password: process.env.DB_PASSWORD,  // .env 파일에서 비밀번호를 가져옵니다.
  port: process.env.DB_PORT,  // .env 파일에서 포트를 가져옵니다.
});

export default client;
