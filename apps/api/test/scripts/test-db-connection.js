const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const rootEnv = path.join(__dirname, '..', '.env');
const apiEnv = path.join(__dirname, '..', 'apps', 'api', '.env');

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else if (fs.existsSync(apiEnv)) {
  dotenv.config({ path: apiEnv });
} else {
}

const url = process.env.DATABASE_URL;
if (!url) {
  process.exit(1);
}

const _maskedUrl = url.replace(/:([^:@]+)@/, ':****@');

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();

    const _res = await client.query('SELECT NOW()');

    await client.end();
    process.exit(0);
  } catch (_err) {
    process.exit(1);
  }
})();
