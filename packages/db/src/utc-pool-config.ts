import type { PoolConfig } from "pg";

/** Force PostgreSQL session timezone to UTC for predictable timestamptz reads/writes. */
export function withUtcSessionTimezone(config: PoolConfig): PoolConfig {
  const existing = config.options?.trim();
  const utcOption = "-c TimeZone=UTC";
  return {
    ...config,
    options: existing ? `${existing} ${utcOption}` : utcOption,
  };
}

export function createUtcPoolConfig(connectionString: string): PoolConfig;
export function createUtcPoolConfig(config: PoolConfig): PoolConfig;
export function createUtcPoolConfig(
  configOrConnectionString: string | PoolConfig,
): PoolConfig {
  if (typeof configOrConnectionString === "string") {
    return withUtcSessionTimezone({
      connectionString: configOrConnectionString,
    });
  }
  return withUtcSessionTimezone(configOrConnectionString);
}