import { Logger } from '@nestjs/common';

const logger = new Logger('DefaulterFallbackSmoke');
const base = process.env['DOCITA_API_BASE'] ?? 'http://localhost:3001';

type ProbeResult = {
  endpoint: string;
  status: number;
  ok: boolean;
  required: boolean;
};

async function probe(
  endpoint: string,
  required: boolean,
): Promise<ProbeResult> {
  const response = await fetch(`${base}${endpoint}`);

  return {
    endpoint,
    status: response.status,
    ok: response.status >= 200 && response.status < 500,
    required,
  };
}

async function main() {
  const checks = await Promise.all([
    probe('/health', false),
    probe('/health/db', false),
    probe('/pricing/config', true),
    probe('/pricing/estimate', true),
  ]);

  const failed = checks.filter((check) => check.required && !check.ok);

  logger.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        base,
        checks,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

void main();
