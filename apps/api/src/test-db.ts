import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  console.log(
    'Testing connection to:',
    connectionString ? connectionString.substring(0, 20) + '...' : 'UNDEFINED',
  );

  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database using pg Pool');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
