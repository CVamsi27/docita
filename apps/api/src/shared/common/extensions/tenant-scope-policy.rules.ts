import { Prisma } from '@workspace/db';
import { isRecord } from '@workspace/utils';
import {
  type TenantExtensionArgs,
  type TenantScopeRule,
  type TenantScopeRuleSnapshot,
  type PropertyValue,
  TENANT_FIELD,
} from './tenant-scope-policy.types';

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

function hasScalarClinicId(model: {
  fields: ReadonlyArray<{ kind: string; name: string }>;
}) {
  return model.fields.some(
    (field) => field.kind === 'scalar' && field.name === TENANT_FIELD,
  );
}

function buildTenantScopeRules(): ReadonlyMap<string, TenantScopeRule> {
  const rules = new Map<string, TenantScopeRule>();

  for (const model of Prisma.dmmf.datamodel.models) {
    if (DIRECT_SCOPE_EXCLUSIONS.has(model.name)) {
      continue;
    }

    if (hasScalarClinicId(model)) {
      rules.set(model.name, { kind: 'direct' });
    }
  }

  for (const [modelName, path] of Object.entries(
    INDIRECT_TENANT_RELATION_PATHS,
  )) {
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

export function getTenantScopeRuleSnapshots(): TenantScopeRuleSnapshot[] {
  const snapshots: TenantScopeRuleSnapshot[] = Array.from(
    TENANT_SCOPE_RULES.entries(),
  ).map(([model, rule]) => ({
    model,
    kind: rule.kind,
    path: rule.kind === 'relation' ? rule.path : undefined,
  }));
  return snapshots.sort((a, b) => a.model.localeCompare(b.model));
}
