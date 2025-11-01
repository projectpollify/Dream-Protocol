/**
 * Module 07: Content - Database Connection
 */

import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const getClient = (): Promise<PoolClient> => pool.connect();

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getPool = () => pool;

export default pool;
