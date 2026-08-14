import { Prisma } from '@workspace/db';
import { isRecord } from '@workspace/utils';
import { EncryptionService } from '@/shared/common/encryption.service';

type PatientExtensionArgs = {
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

function readPatientExtensionData(
  value: unknown,
): Record<string, unknown> | Record<string, unknown>[] | undefined {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (isRecord(value)) {
    return value;
  }
  return undefined;
}

function toPatientExtensionArgs(value: unknown): PatientExtensionArgs | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    data: readPatientExtensionData(value.data),
    create: isRecord(value.create) ? value.create : undefined,
    update: isRecord(value.update) ? value.update : undefined,
  };
}

export const createEncryptionExtension = (
  encryptionService: EncryptionService,
) =>
  Prisma.defineExtension({
    name: 'encryption-extension',
    query: {
      patient: {
        async $allOperations({ operation, args, query }) {
          if (
            ['create', 'update', 'upsert', 'createMany'].includes(operation)
          ) {
            const typedArgs = toPatientExtensionArgs(args);
            if (!typedArgs) return query(args);
            if (typedArgs.data) {
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data = typedArgs.data.map(
                  (item: Record<string, unknown>) =>
                    encryptionService.encryptPatientData(item),
                );
              } else {
                typedArgs.data = encryptionService.encryptPatientData(
                  typedArgs.data,
                );
              }
            }
            if (operation === 'upsert') {
              if (typedArgs.create)
                typedArgs.create = encryptionService.encryptPatientData(
                  typedArgs.create,
                );
              if (typedArgs.update)
                typedArgs.update = encryptionService.encryptPatientData(
                  typedArgs.update,
                );
            }
          }

          const result = await query(args);

          return result;
        },
      },
    },
    result: {
      patient: {
        email: {
          needs: { email: true },
          compute(patient) {
            return patient.email
              ? encryptionService.decrypt(patient.email)
              : patient.email;
          },
        },
        phoneNumber: {
          needs: { phoneNumber: true },
          compute(patient) {
            return encryptionService.decrypt(patient.phoneNumber);
          },
        },
        address: {
          needs: { address: true },
          compute(patient) {
            return patient.address
              ? encryptionService.decrypt(patient.address)
              : patient.address;
          },
        },
        emergencyContactPhone: {
          needs: { emergencyContactPhone: true },
          compute(patient) {
            return patient.emergencyContactPhone
              ? encryptionService.decrypt(patient.emergencyContactPhone)
              : patient.emergencyContactPhone;
          },
        },
        emergencyContactName: {
          needs: { emergencyContactName: true },
          compute(patient) {
            return patient.emergencyContactName
              ? encryptionService.decrypt(patient.emergencyContactName)
              : patient.emergencyContactName;
          },
        },
        firstName: {
          needs: { firstName: true },
          compute(patient) {
            return encryptionService.decrypt(patient.firstName);
          },
        },
        lastName: {
          needs: { lastName: true },
          compute(patient) {
            return encryptionService.decrypt(patient.lastName);
          },
        },
        preferredName: {
          needs: { preferredName: true },
          compute(patient) {
            return patient.preferredName
              ? encryptionService.decrypt(patient.preferredName)
              : patient.preferredName;
          },
        },
        insuranceProvider: {
          needs: { insuranceProvider: true },
          compute(patient) {
            return patient.insuranceProvider
              ? encryptionService.decrypt(patient.insuranceProvider)
              : patient.insuranceProvider;
          },
        },
        insurancePolicyNumber: {
          needs: { insurancePolicyNumber: true },
          compute(patient) {
            return patient.insurancePolicyNumber
              ? encryptionService.decrypt(patient.insurancePolicyNumber)
              : patient.insurancePolicyNumber;
          },
        },
        insuranceGroupNumber: {
          needs: { insuranceGroupNumber: true },
          compute(patient) {
            return patient.insuranceGroupNumber
              ? encryptionService.decrypt(patient.insuranceGroupNumber)
              : patient.insuranceGroupNumber;
          },
        },
        allergies: {
          needs: { allergies: true },
          compute(patient) {
            return patient.allergies
              ? encryptionService.decrypt(patient.allergies)
              : patient.allergies;
          },
        },
        abhaAddress: {
          needs: { abhaAddress: true },
          compute(patient) {
            return patient.abhaAddress
              ? encryptionService.decrypt(patient.abhaAddress)
              : patient.abhaAddress;
          },
        },
      },
    },
  });
