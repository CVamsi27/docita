import { Prisma } from '@workspace/db';
import { encryptionService } from '../encryption.service';

export const encryptionExtension = Prisma.defineExtension({
  name: 'encryption-extension',
  query: {
    patient: {
      async $allOperations({ operation, args, query }) {
        // Encrypt on Request (Write)
        if (['create', 'update', 'upsert', 'createMany'].includes(operation)) {
          const typedArgs = args as any;
          if (typedArgs.data) {
            if (Array.isArray(typedArgs.data)) {
              typedArgs.data = typedArgs.data.map((item: any) =>
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

        // Execute query
        const result = await query(args);

        // Decrypt on Response (Read)
        if (
          [
            'findUnique',
            'findFirst',
            'findMany',
            'create',
            'update',
            'upsert',
            'delete',
          ].includes(operation) &&
          result
        ) {
          if (Array.isArray(result)) {
            return result.map((item) =>
              encryptionService.decryptPatientData(item),
            );
          } else {
            return encryptionService.decryptPatientData(result);
          }
        }

        return result;
      },
    },
  },
});
