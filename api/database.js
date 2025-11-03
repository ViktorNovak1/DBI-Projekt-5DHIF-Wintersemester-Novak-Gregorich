// database.js
import { Pool } from 'pg';

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'postgres',
  password: 'admin',
  port: 5432,
});

export default pool;