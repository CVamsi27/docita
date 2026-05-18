import { Prisma } from '@workspace/db';
import { EncryptionService } from '@/shared/common/encryption.service';

type PatientExtensionArgs = {
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

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
            const typedArgs = args as PatientExtensionArgs;
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
      },
    },
  });
