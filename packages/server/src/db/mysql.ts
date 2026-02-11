import mysql from 'mysql2/promise';
import { config } from '../config/index.js';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.on('connection', () => {
  console.log('[MySQL] New connection established');
});

export async function checkMySQLConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('[MySQL] Connection verified successfully');
    return true;
  } catch (error) {
    console.error('[MySQL] Connection failed:', (error as Error).message);
    return false;
  }
}
