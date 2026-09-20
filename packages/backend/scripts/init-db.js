import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { dbConfig } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(here, '../sql/schema.sql'), 'utf8');

const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
await conn.query(sql);
await conn.end();
console.log(`Schema applied to ${dbConfig.database} on ${dbConfig.host}`);
