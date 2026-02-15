import { Prisma } from '@workspace/db';
import { getCurrentTenant } from '../middleware/tenant.middleware';

// Hardcoded list of tenant-scoped models
// In a perfect world we'd derive this from Prisma.ModelName but that might include non-models
const TENANT_SCOPED_MODELS = [
  'Patient',
  'Appointment',
  'Prescription',
  'Invoice',
  'Document',
  'VitalSign',
  'LabTest',
  'Reminder',
  'QueueEntry',
  'CustomField',
  'PrescriptionTemplate',
  'ClinicalTemplate',
  'User',
  'DoctorSchedule',
  'DoctorTimeOff',
  'AuditLog',
  'AuditLogArchive',
  'AppointmentArchive',
  'WhatsappLog',
  'WhatsappLogArchive',
  'ErrorLog',
  'Feedback',
  'InventoryItem',
  'InventoryMovement',
  'LabTestOrder',
  'Consent',
  'QueueToken',
  'BulkImportJob',
  'ImportJob',
  'OcrDocument',
  'StaffNotification',
  'ReminderSettings',
  'AppointmentReminder',
  'PaymentSession',
  'Subscription',
  'SubscriptionPayment',
  'AnalyticsSnapshot',
  'Ward',
  'Room',
  'Bed',
  'Admission',
];

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-extension',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Skip if not tenant scoped
        // console.log('TenantExtension checking model:', model);
        if (!model || !TENANT_SCOPED_MODELS.includes(model)) {
          // console.log('TenantExtension skipping model:', model);
          return query(args);
        }

        const tenant = getCurrentTenant();

        // Allow bypassing tenant check for system tasks
        if (tenant?.bypassed) {
          return query(args);
        }

        // STRICT MODE
        if (!tenant?.clinicId) {
          throw new Error(
            `Security Violation: Attempted to access tenant-scoped model '${model}' without a valid tenant context.`,
          );
        }

        const typedArgs = args as any;

        // Models that don't have direct clinicId but relate to it
        const RELATION_MAPPING: Record<string, string> = {
          Prescription: 'patient',
          Invoice: 'patient',
          Document: 'patient',
          VitalSign: 'appointment',
        };

        const relation = RELATION_MAPPING[model as string];

        // Inject clinicId into WHERE clauses for Read operations
        if (
          [
            'findMany',
            'findFirst',
            'findUnique',
            'count',
            'aggregate',
            'groupBy',
          ].includes(operation)
        ) {
          if (relation) {
            const existingRelation = typedArgs.where?.[relation] || {};
            typedArgs.where = {
              ...(typedArgs.where || {}),
              [relation]: {
                ...existingRelation,
                clinicId: tenant.clinicId,
              },
            };
          } else {
            typedArgs.where = {
              ...(typedArgs.where || {}),
              clinicId: tenant.clinicId,
            };
          }
        }

        // Inject clinicId into Data for Create operations
        // We only inject if it's a direct field (no relation mapping)
        if (operation === 'create' && tenant.clinicId && !relation) {
          const data = typedArgs.data || {};
          // Only inject clinicId if clinic relation is not already provided
          // This prevents "Unknown argument clinicId" error when using 'connect'
          if (!data.clinic) {
            typedArgs.data = {
              ...data,
              clinicId: tenant.clinicId,
            };
          }
        }

        if (operation === 'createMany' && tenant.clinicId && !relation) {
          if (Array.isArray(typedArgs.data)) {
            // TS might complain about spread on unknown
            typedArgs.data = typedArgs.data.map((item: Record<string, unknown>) => ({
              ...item,
              clinicId: tenant.clinicId,
            }));
          }
        }

        // Enforce clinicId on Update/Delete
        if (
          ['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)
        ) {
          if (relation) {
            const existingRelation = typedArgs.where?.[relation] || {};
            typedArgs.where = {
              ...(typedArgs.where || {}),
              [relation]: {
                ...existingRelation,
                clinicId: tenant.clinicId,
              },
            };
          } else {
            typedArgs.where = {
              ...(typedArgs.where || {}),
              clinicId: tenant.clinicId,
            };
          }
        }

        return query(args);
      },
    },
  },
});
