import { Prisma } from '@workspace/db';
import { getCurrentTenant } from '@/common/middleware/tenant.middleware';

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
  'PdfJob',
];

type PropertyValue =
  | object
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

type TenantExtensionArgs = {
  where?: Record<string, PropertyValue>;
  data?: Record<string, PropertyValue> | Record<string, PropertyValue>[];
};

function isPlainObject(value: PropertyValue): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-extension',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_SCOPED_MODELS.includes(model)) {
          return query(args);
        }

        const tenant = getCurrentTenant();

        if (tenant?.bypassed) {
          return query(args);
        }

        if (!tenant?.clinicId) {
          throw new Error(
            `Security Violation: Attempted to access tenant-scoped model '${model}' without a valid tenant context.`,
          );
        }

        const typedArgs = args as TenantExtensionArgs;

        const RELATION_MAPPING: Record<string, string> = {
          Prescription: 'patient',
          Invoice: 'patient',
          Document: 'patient',
          VitalSign: 'appointment',
        };

        const relation = RELATION_MAPPING[model];

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
            const existingRelationValue = typedArgs.where?.[relation];
            const existingRelation = isPlainObject(existingRelationValue)
              ? existingRelationValue
              : {};
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

        if (operation === 'create' && tenant.clinicId && !relation) {
          const data = isPlainObject(typedArgs.data)
            ? typedArgs.data
            : undefined;

          if (
            !data ||
            !('clinic' in data) ||
            !(data as { clinic?: object | null }).clinic
          ) {
            typedArgs.data = {
              ...(data || {}),
              clinicId: tenant.clinicId,
            };
          }
        }

        if (operation === 'createMany' && tenant.clinicId && !relation) {
          if (Array.isArray(typedArgs.data)) {
            typedArgs.data = typedArgs.data.map((item) => ({
              ...item,
              clinicId: tenant.clinicId,
            }));
          }
        }

        if (
          ['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)
        ) {
          if (relation) {
            const existingRelationValue = typedArgs.where?.[relation];
            const existingRelation = isPlainObject(existingRelationValue)
              ? existingRelationValue
              : {};
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
