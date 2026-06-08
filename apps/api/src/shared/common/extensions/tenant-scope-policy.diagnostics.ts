import { Prisma } from '@workspace/db';
import { isRecord } from '@workspace/utils';
import {
  type PropertyValue,
  type TenantExtensionArgs,
  type TenantScopeRule,
  TENANT_FIELD,
} from './tenant-scope-policy.types';
import {
  coerceTenantExtensionArgs,
  coerceTenantUpsertExtensionArgs,
} from './tenant-scope-policy.coerce';
import {
  DIRECT_SCOPE_EXCLUSIONS,
  getTenantScopeRule,
  getTenantScopeRuleSnapshots,
} from './tenant-scope-policy.rules';

const TENANT_READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const TENANT_WRITE_FILTER_OPERATIONS = new Set(['updateMany', 'deleteMany']);

const TENANT_UNSAFE_UNIQUE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
  'upsert',
]);

function hasScalarClinicIdField(model: {
  fields: ReadonlyArray<{ kind: string; name: string }>;
}) {
  return model.fields.some(
    (field) => field.kind === 'scalar' && field.name === TENANT_FIELD,
  );
}

function listClinicIdModelNames(): string[] {
  return Prisma.dmmf.datamodel.models
    .filter(hasScalarClinicIdField)
    .map((model) => model.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getTenantScopeDiagnostics(asOf: Date) {
  const modelNames = new Set(
    Prisma.dmmf.datamodel.models.map((model) => model.name),
  );
  const clinicIdModels = listClinicIdModelNames();
  const rules = getTenantScopeRuleSnapshots();
  const rulesByModel = new Map(rules.map((r) => [r.model, r]));

  return {
    totalModels: Prisma.dmmf.datamodel.models.length,
    clinicIdModels: clinicIdModels.length,
    scopedModels: rules.length,
    directScopedModels: rules.filter((rule) => rule.kind === 'direct').length,
    relationScopedModels: rules.filter((rule) => rule.kind === 'relation')
      .length,
    uncoveredClinicIdModels: clinicIdModels.filter(
      (m) => !DIRECT_SCOPE_EXCLUSIONS.has(m) && !rulesByModel.has(m),
    ),
    excludedClinicIdModels: clinicIdModels.filter((m) =>
      DIRECT_SCOPE_EXCLUSIONS.has(m),
    ),
    staleRelationRules: getStaleRelationRules(modelNames),
    rules,
    generatedAt: asOf.toISOString(),
  };
}

function getStaleRelationRules(modelNames: Set<string>): string[] {
  // Lazy import to avoid a circular dependency with rules.ts.
  const { INDIRECT_TENANT_RELATION_PATHS } = require('./tenant-scope-policy.rules');
  return Object.keys(INDIRECT_TENANT_RELATION_PATHS)
    .filter((model) => !modelNames.has(model))
    .sort((a, b) => a.localeCompare(b));
}

function buildRelationTenantFilter(
  path: readonly string[],
  clinicId: string,
): Record<string, PropertyValue> {
  return path.reduceRight<Record<string, PropertyValue>>(
    (nested, relation) => ({ [relation]: nested }),
    { [TENANT_FIELD]: clinicId },
  );
}

function appendAndFilter(
  where: Record<string, PropertyValue> | undefined,
  filter: Record<string, PropertyValue>,
): Record<string, PropertyValue> {
  const existingWhere = where ?? {};
  const existingAnd = existingWhere['AND'];
  const andFilters = Array.isArray(existingAnd)
    ? existingAnd
    : existingAnd
      ? [existingAnd]
      : [];

  return {
    ...existingWhere,
    AND: [...andFilters, filter],
  };
}

function applyTenantFilter(
  args: TenantExtensionArgs,
  rule: TenantScopeRule,
  clinicId: string,
) {
  if (rule.kind === 'direct') {
    args.where = {
      ...(args.where ?? {}),
      [TENANT_FIELD]: clinicId,
    };
    return;
  }

  args.where = appendAndFilter(
    args.where,
    buildRelationTenantFilter(rule.path, clinicId),
  );
}

function hasClinicRelation(data: Record<string, PropertyValue>): boolean {
  return 'clinic' in data && Boolean(data.clinic);
}

function isTenantDataObject(
  value: PropertyValue,
): value is Record<string, PropertyValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function applyTenantCreateData(
  args: TenantExtensionArgs,
  rule: TenantScopeRule,
  clinicId: string,
) {
  if (rule.kind !== 'direct') {
    return;
  }

  const data = args.data;
  if (Array.isArray(data)) {
    args.data = data.map((item) => {
      const existingClinicId = item?.[TENANT_FIELD];
      if (
        typeof existingClinicId === 'string' &&
        existingClinicId !== clinicId
      ) {
        throw new Error(
          `Security Violation: Attempted to write tenant-scoped data for '${existingClinicId}' while in tenant '${clinicId}'.`,
        );
      }

      return {
        ...item,
        [TENANT_FIELD]: clinicId,
      };
    });
    return;
  }

  if (!isTenantDataObject(data)) {
    args.data = { [TENANT_FIELD]: clinicId };
    return;
  }

  const existingClinicId = data[TENANT_FIELD];
  if (typeof existingClinicId === 'string' && existingClinicId !== clinicId) {
    throw new Error(
      `Security Violation: Attempted to write tenant-scoped data for '${existingClinicId}' while in tenant '${clinicId}'.`,
    );
  }

  if (!hasClinicRelation(data)) {
    args.data = {
      ...data,
      [TENANT_FIELD]: clinicId,
    };
  }
}

function applyTenantUpsertData(
  args: TenantExtensionArgs & {
    create?: Record<string, PropertyValue>;
    update?: Record<string, PropertyValue>;
    where?: Record<string, PropertyValue>;
  },
  rule: TenantScopeRule,
  clinicId: string,
) {
  if (rule.kind !== 'direct') {
    return;
  }

  if (isTenantDataObject(args.create)) {
    const existingClinicId = args.create[TENANT_FIELD];
    if (typeof existingClinicId === 'string' && existingClinicId !== clinicId) {
      throw new Error(
        `Security Violation: Attempted to write tenant-scoped data for '${existingClinicId}' while in tenant '${clinicId}'.`,
      );
    }

    if (!hasClinicRelation(args.create)) {
      args.create = {
        ...args.create,
        [TENANT_FIELD]: clinicId,
      };
    }
  }

  if (isTenantDataObject(args.update)) {
    const updateClinicId = args.update[TENANT_FIELD];
    if (typeof updateClinicId === 'string' && updateClinicId !== clinicId) {
      throw new Error(
        `Security Violation: Attempted to change tenant field '${TENANT_FIELD}' on an upsert.`,
      );
    }
  }
}

function enforceTenantOnUnsafeUniqueOperation(
  model: string,
  operation: string,
  rule: TenantScopeRule,
  args: TenantExtensionArgs,
  clinicId: string,
) {
  if (rule.kind !== 'direct') {
    throw new Error(
      `Security Violation: Operation '${operation}' is not allowed on indirectly tenant-scoped model '${model}'. Use a tenant-qualified 'findFirst'/'updateMany' pattern instead.`,
    );
  }

  const where = args.where ?? {};
  const whereClinicId = where[TENANT_FIELD];

  if (typeof whereClinicId !== 'string') {
    throw new Error(
      `Security Violation: Operation '${operation}' on model '${model}' must include '${TENANT_FIELD}' in 'where'. Use a tenant-qualified 'findFirst'/'updateMany' pattern or a clinic-scoped unique constraint.`,
    );
  }

  if (whereClinicId !== clinicId) {
    throw new Error(
      `Security Violation: Attempted to access tenant-scoped model '${model}' for '${whereClinicId}' while in tenant '${clinicId}'.`,
    );
  }
}

export function applyTenantScopeForTest(
  model: string,
  operation: string,
  args: TenantExtensionArgs,
  clinicId: string,
): TenantExtensionArgs {
  const rule = getTenantScopeRule(model);
  if (!rule) return args;

  if (TENANT_UNSAFE_UNIQUE_OPERATIONS.has(operation)) {
    enforceTenantOnUnsafeUniqueOperation(
      model,
      operation,
      rule,
      args,
      clinicId,
    );
    if (operation === 'upsert') {
      applyTenantUpsertData(
        coerceTenantUpsertExtensionArgs(args),
        rule,
        clinicId,
      );
    }
    return args;
  }

  if (
    TENANT_READ_OPERATIONS.has(operation) ||
    TENANT_WRITE_FILTER_OPERATIONS.has(operation)
  ) {
    applyTenantFilter(args, rule, clinicId);
  }

  if (operation === 'create' || operation === 'createMany') {
    applyTenantCreateData(args, rule, clinicId);
  }

  return args;
}
