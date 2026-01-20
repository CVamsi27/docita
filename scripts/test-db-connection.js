const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try loading .env from repo root or apps/api
const rootEnv = path.join(__dirname, '..', '.env');
const apiEnv = path.join(__dirname, '..', 'apps', 'api', '.env');

if (fs.existsSync(rootEnv)) {
  console.log('Loading .env from root');
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(apiEnv)) {
  console.log('Loading .env from apps/api');
  dotenv.config({ path: apiEnv });
} else {
  console.log('No .env found, relying on process.env');
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

// Mask password for logging
const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
console.log(`Testing connection to: ${maskedUrl}`);

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false } // Neon usually requires strict SSL, but for testing raw connectivity try lax first
});

(async () => {
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Check time:', res.rows[0]);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
})();
