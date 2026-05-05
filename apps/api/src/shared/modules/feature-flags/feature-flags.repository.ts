import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';

export interface FeatureFlagRecord {
  key: string;
  description: string;
  defaultEnabled: boolean;
  clinicOverrides: Record<string, boolean> | null;
  userOverrides: Record<string, boolean> | null;
  percentageRollout: number | null;
}

const isBoolMap = (
  value: Prisma.JsonValue | null | undefined,
): value is Record<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((v) => typeof v === 'boolean');
};

const toRecord = (
  row: {
    key: string;
    description: string;
    defaultEnabled: boolean;
    clinicOverrides: Prisma.JsonValue | null;
    userOverrides: Prisma.JsonValue | null;
    percentageRollout: number | null;
  } | null,
): FeatureFlagRecord | null => {
  if (!row) return null;
  return {
    key: row.key,
    description: row.description,
    defaultEnabled: row.defaultEnabled,
    clinicOverrides: isBoolMap(row.clinicOverrides)
      ? row.clinicOverrides
      : null,
    userOverrides: isBoolMap(row.userOverrides) ? row.userOverrides : null,
    percentageRollout: row.percentageRollout,
  };
};

@Injectable()
export class FeatureFlagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<FeatureFlagRecord[]> {
    return this.prisma.runUnrestricted(async () => {
      const rows = await this.prisma.featureFlagDefinition.findMany();
      return rows
        .map((row) => toRecord(row))
        .filter((record): record is FeatureFlagRecord => record !== null);
    });
  }

  async findByKey(key: string): Promise<FeatureFlagRecord | null> {
    return this.prisma.runUnrestricted(async () =>
      toRecord(
        await this.prisma.featureFlagDefinition.findUnique({ where: { key } }),
      ),
    );
  }

  async upsert(record: FeatureFlagRecord): Promise<FeatureFlagRecord> {
    const stored = await this.prisma.runUnrestricted(async () =>
      this.prisma.featureFlagDefinition.upsert({
        where: { key: record.key },
        update: {
          description: record.description,
          defaultEnabled: record.defaultEnabled,
          clinicOverrides: record.clinicOverrides ?? Prisma.JsonNull,
          userOverrides: record.userOverrides ?? Prisma.JsonNull,
          percentageRollout: record.percentageRollout,
        },
        create: {
          key: record.key,
          description: record.description,
          defaultEnabled: record.defaultEnabled,
          clinicOverrides: record.clinicOverrides ?? Prisma.JsonNull,
          userOverrides: record.userOverrides ?? Prisma.JsonNull,
          percentageRollout: record.percentageRollout,
        },
      }),
    );
    const out = toRecord(stored);
    if (!out) {
      throw new Error('FeatureFlagDefinition upsert returned an empty row');
    }
    return out;
  }

  async kill(key: string): Promise<FeatureFlagRecord | null> {
    return this.prisma.runUnrestricted(async () => {
      const existing = await this.prisma.featureFlagDefinition.findUnique({
        where: { key },
      });
      if (!existing) return null;
      const updated = await this.prisma.featureFlagDefinition.update({
        where: { key },
        data: {
          defaultEnabled: false,
          clinicOverrides: Prisma.JsonNull,
          userOverrides: Prisma.JsonNull,
          percentageRollout: null,
        },
      });
      return toRecord(updated);
    });
  }
}
