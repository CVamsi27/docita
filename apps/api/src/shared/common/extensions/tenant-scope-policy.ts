import { Prisma } from '@workspace/db';

export const TENANT_FIELD = 'clinicId';

export const DIRECT_SCOPE_EXCLUSIONS = new Set([
  // Feature flags intentionally support global defaults with clinic overrides.
  'FeatureFlag',
]);

export const INDIRECT_TENANT_RELATION_PATHS = {
  AppointmentReminder: ['appointment'],
  Bed: ['room', 'ward'],
  Diagnosis: ['appointment'],
  Document: ['patient'],
  DoctorFavoriteCode: ['user'],
  Immunization: ['patient'],
  InventoryMovement: ['inventoryItem'],
  Medication: ['prescription', 'patient'],
  MetricOption: ['definition'],
  PatientAllergy: ['patient'],
  PatientFamilyHistory: ['patient'],
  PatientMetricValue: ['metricRecord'],
  PatientSocialHistory: ['patient'],
  PatientSurgicalHistory: ['patient'],
  PatientTag: ['patient'],
  Prescription: ['patient'],
  PrescriptionTemplate: ['user'],
  Procedure: ['appointment'],
  Room: ['ward'],
  VitalSign: ['appointment'],
} as const satisfies Record<string, readonly string[]>;

export type TenantScopeRule =
  | { kind: 'direct' }
  | { kind: 'relation'; path: readonly string[] };

export type TenantScopeRuleSnapshot = {
  model: string;
  kind: TenantScopeRule['kind'];
  path?: readonly string[];
};

export type PropertyValue =
  | object
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export type TenantExtensionArgs = {
  where?: Record<string, PropertyValue>;
  data?: Record<string, PropertyValue> | Record<string, PropertyValue>[];
};

export const TENANT_READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

export const TENANT_WRITE_FILTER_OPERATIONS = new Set([
  'updateMany',
  'deleteMany',
]);

export const TENANT_UNSAFE_UNIQUE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
  'upsert',
]);

export function isPlainObject(value: PropertyValue): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasScalarClinicId(model: {
  fields: ReadonlyArray<{ kind: string; name: string }>;
}) {
  return model.fields.some(
    (field) => field.kind === 'scalar' && field.name === TENANT_FIELD,
  );
}

export function buildTenantScopeRules(): ReadonlyMap<string, TenantScopeRule> {
  const rules = new Map<string, TenantScopeRule>();

  for (const model of Prisma.dmmf.datamodel.models) {
    if (DIRECT_SCOPE_EXCLUSIONS.has(model.name)) {
      continue;
    }

    if (hasScalarClinicId(model)) {
      rules.set(model.name, { kind: 'direct' });
    }
  }

  for (const [modelName, path] of Object.entries(INDIRECT_TENANT_RELATION_PATHS)) {
    if (!rules.has(modelName)) {
      rules.set(modelName, { kind: 'relation', path });
    }
  }

  return rules;
}

const TENANT_SCOPE_RULES = buildTenantScopeRules();

export function getTenantScopeRule(
  model: string | undefined,
): TenantScopeRule | undefined {
  return model ? TENANT_SCOPE_RULES.get(model) : undefined;
}

function getTenantScopeRuleSnapshots(): TenantScopeRuleSnapshot[] {
  return Array.from(TENANT_SCOPE_RULES.entries())
    .map(([model, rule]) => ({
      model,
      kind: rule.kind,
      path: rule.kind === 'relation' ? rule.path : undefined,
    }))
    .sort((a, b) => a.model.localeCompare(b.model));
}

export function getTenantScopeDiagnostics(asOf: Date) {
  const modelNames = new Set(
    Prisma.dmmf.datamodel.models.map((model) => model.name),
  );
  const clinicIdModels = Prisma.dmmf.datamodel.models
    .filter(hasScalarClinicId)
    .map((model) => model.name)
    .sort((a, b) => a.localeCompare(b));
  const excludedClinicIdModels = clinicIdModels.filter((model) =>
    DIRECT_SCOPE_EXCLUSIONS.has(model),
  );
  const uncoveredClinicIdModels = clinicIdModels.filter(
    (model) =>
      !DIRECT_SCOPE_EXCLUSIONS.has(model) && !TENANT_SCOPE_RULES.has(model),
  );
  const staleRelationRules = Object.keys(INDIRECT_TENANT_RELATION_PATHS)
    .filter((model) => !modelNames.has(model))
    .sort((a, b) => a.localeCompare(b));
  const rules = getTenantScopeRuleSnapshots();

  return {
    totalModels: Prisma.dmmf.datamodel.models.length,
    clinicIdModels: clinicIdModels.length,
    scopedModels: rules.length,
    directScopedModels: rules.filter((rule) => rule.kind === 'direct').length,
    relationScopedModels: rules.filter((rule) => rule.kind === 'relation')
      .length,
    uncoveredClinicIdModels,
    excludedClinicIdModels,
    staleRelationRules,
    rules,
    generatedAt: asOf.toISOString(),
  };
}

export function buildRelationTenantFilter(
  path: readonly string[],
  clinicId: string,
): Record<string, PropertyValue> {
  return path.reduceRight<Record<string, PropertyValue>>(
    (nested, relation) => ({ [relation]: nested }),
    { [TENANT_FIELD]: clinicId },
  );
}

export function appendAndFilter(
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

export function applyTenantFilter(
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
  return Boolean(
    'clinic' in data && (data as { clinic?: object | null }).clinic,
  );
}

export function applyTenantCreateData(
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

  if (!isPlainObject(data)) {
    args.data = { [TENANT_FIELD]: clinicId };
    return;
  }

  const existingClinicId = (data as Record<string, PropertyValue>)[
    TENANT_FIELD
  ];
  if (typeof existingClinicId === 'string' && existingClinicId !== clinicId) {
    throw new Error(
      `Security Violation: Attempted to write tenant-scoped data for '${existingClinicId}' while in tenant '${clinicId}'.`,
    );
  }

  if (!hasClinicRelation(data as Record<string, PropertyValue>)) {
    args.data = {
      ...(data as Record<string, PropertyValue>),
      [TENANT_FIELD]: clinicId,
    };
  }
}

export function applyTenantUpsertData(
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

  if (isPlainObject(args.create)) {
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

  if (isPlainObject(args.update)) {
    const updateClinicId = args.update[TENANT_FIELD];
    if (typeof updateClinicId === 'string' && updateClinicId !== clinicId) {
      throw new Error(
        `Security Violation: Attempted to change tenant field '${TENANT_FIELD}' on an upsert.`,
      );
    }
  }
}

export function enforceTenantOnUnsafeUniqueOperation(
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
  if (!rule) {
    return args;
  }

  if (TENANT_UNSAFE_UNIQUE_OPERATIONS.has(operation)) {
    enforceTenantOnUnsafeUniqueOperation(
      model,
      operation,
      rule,
      args,
      clinicId,
    );
    if (operation === 'upsert') {
      applyTenantUpsertData(args as never, rule, clinicId);
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
