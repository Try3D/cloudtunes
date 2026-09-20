import fs from 'node:fs';
import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'cloudtunes',
  password: process.env.DB_PASS || 'cloudtunes',
  database: process.env.DB_NAME || 'cloudtunes',
  // DB_SSL_CA forces TLS to RDS in production
  ...(process.env.DB_SSL_CA ? { ssl: { ca: fs.readFileSync(process.env.DB_SSL_CA) } } : {}),
};

export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}
