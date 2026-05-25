import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  upsertEnterpriseContractRequestSchema,
  enterpriseContractStatusSchema,
} from '@workspace/types';

export class UpsertEnterpriseContractDto extends createZodDto(
  upsertEnterpriseContractRequestSchema,
) {}

export const setEnterpriseContractStatusSchema = z.object({
  status: enterpriseContractStatusSchema,
});

export class SetEnterpriseContractStatusDto extends createZodDto(
  setEnterpriseContractStatusSchema,
) {}

export const addContractMemberSchema = z.object({
  clinicId: z.string().min(1),
});

export class AddContractMemberDto extends createZodDto(
  addContractMemberSchema,
) {}
