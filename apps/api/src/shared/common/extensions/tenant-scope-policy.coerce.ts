import { isRecord } from '@workspace/utils';
import {
  type PropertyValue,
  type TenantExtensionArgs,
  readPropertyValueRecord,
} from './tenant-scope-policy.types';

/** Prisma middleware passes opaque args; tenant policy validates structure. */
export function coerceTenantExtensionArgs(args: unknown): TenantExtensionArgs {
  if (!isRecord(args)) {
    return {};
  }

  const data = args.data;
  const normalizedData = Array.isArray(data)
    ? data
        .filter(isRecord)
        .map((entry) => readPropertyValueRecord(entry))
        .filter((entry): entry is Record<string, PropertyValue> => !!entry)
    : readPropertyValueRecord(data);

  return {
    where: readPropertyValueRecord(args.where),
    data: normalizedData,
  };
}

export function coerceTenantUpsertExtensionArgs(
  args: unknown,
): TenantExtensionArgs & {
  create?: Record<string, PropertyValue>;
  update?: Record<string, PropertyValue>;
} {
  const base = coerceTenantExtensionArgs(args);
  if (!isRecord(args)) {
    return base;
  }

  return {
    ...base,
    create: readPropertyValueRecord(args.create),
    update: readPropertyValueRecord(args.update),
  };
}
