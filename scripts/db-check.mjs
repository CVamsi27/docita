#!/usr/bin/env node
import net from 'net';
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/);
    if (match) {
      process.env.DATABASE_URL = match[1].trim();
      return;
    }
  }
}

function parseUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    return { host: url.hostname, port: parseInt(url.port || '5434', 10) };
  } catch {
    console.error('[db-check] Could not parse DATABASE_URL as a URL.');
    process.exit(1);
  }
}

function tcpPing(host, port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('error', () => done(false));
    socket.on('timeout', () => done(false));
    socket.connect(port, host);
  });
}

async function authPing(connectionString) {
  const pgPath = join(ROOT, 'apps/api/node_modules/pg');
  if (!existsSync(pgPath)) return 'skipped';

  try {
    const pgModule = require(pgPath);
    const Client = pgModule.Client ?? pgModule.default?.Client;
    if (!Client) return 'skipped';

    let url = connectionString;
    try {
      const parsed = new URL(connectionString);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        parsed.searchParams.delete('sslmode');
        parsed.searchParams.delete('ssl');
        url = parsed.toString();
      }
    } catch {}

    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return 'ok';
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('password authentication') || msg.includes('28P01')) {
        return 'auth_error';
      }
      return 'unavailable';
    } finally {
      await client.end().catch(() => {});
    }
  } catch {
    return 'skipped';
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function devCheck(connectionString, host, port) {
  console.log(`[db-check] mode=dev  Checking ${host}:${port}...`);

  const portOpen = await tcpPing(host, port);

  if (!portOpen) {
    console.log('[db-check] Port not reachable. Starting Docker postgres...');

    const composeFile = resolve(ROOT, 'docker-compose.yml');
    if (!existsSync(composeFile)) {
      console.error('[db-check] docker-compose.yml not found. Start your database manually.');
      process.exit(1);
    }

    const result = spawnSync('docker', ['compose', 'up', '-d', 'db'], {
      cwd: ROOT,
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      console.error('[db-check] Failed to start Docker postgres. Is Docker Desktop running?');
      process.exit(1);
    }

    const deadline = Date.now() + 30_000;
    let attempt = 0;
    while (Date.now() < deadline) {
      attempt++;
      await sleep(1_500);
      process.stdout.write(`[db-check] Waiting for postgres... (attempt ${attempt})\r`);
      if (await tcpPing(host, port)) {
        process.stdout.write('\n');
        break;
      }
    }

    if (!(await tcpPing(host, port))) {
      process.stdout.write('\n');
      console.error('[db-check] Timed out waiting for database after 30 s.');
      process.exit(1);
    }
    process.stdout.write('\n');
  }

  const auth = await authPing(connectionString);
  if (auth === 'ok' || auth === 'skipped') {
    console.log('[db-check] Database is UP.');
    return;
  }

  if (auth === 'auth_error') {
    console.error('[db-check] Database port is open but authentication failed.');
    console.error('[db-check] Check that DATABASE_URL credentials match the running database.');
    console.error(`[db-check]   docker-compose user/pass : docita / docita`);
    console.error(`[db-check]   Expected URL format      : postgresql://docita:docita@localhost:5434/docita`);
    console.error('[db-check] Another Postgres instance may already be bound to localhost:5434.');
    console.error('[db-check] Stop the conflicting container or update DATABASE_URL to the active database.');
    process.exit(1);
  }

  console.error('[db-check] Port is open but database is not accepting queries yet.');
  process.exit(1);
}

async function prodCheck(connectionString, host, port) {
  console.log(`[db-check] mode=prod  Pinging Neon at ${host}:${port}...`);

  const MAX_ATTEMPTS = 8;
  const BASE_DELAY_MS = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const portOpen = await tcpPing(host, port);
    if (portOpen) {
      const auth = await authPing(connectionString);
      if (auth === 'ok' || auth === 'skipped') {
        console.log(`[db-check] Database is UP (attempt ${attempt}).`);
        return;
      }
      if (auth === 'auth_error') {
        console.error('[db-check] Authentication failed. Check DATABASE_URL credentials.');
        process.exit(1);
      }
    }

    if (attempt === MAX_ATTEMPTS) break;
    const delay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), 8_000);
    console.log(`[db-check] Not ready (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${delay} ms...`);
    await sleep(delay);
  }

  console.error('[db-check] Database did not respond after all retries. Check Neon dashboard.');
  process.exit(1);
}

loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[db-check] DATABASE_URL is not set. Add it to .env or export it.');
  process.exit(1);
}

const { host, port } = parseUrl(databaseUrl);
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  await prodCheck(databaseUrl, host, port);
} else {
  await devCheck(databaseUrl, host, port);
}
