import { createZodDto } from 'nestjs-zod';
import {
  createJoinRequestSchema,
  approveJoinRequestSchema,
  rejectJoinRequestSchema,
  searchClinicsQuerySchema,
} from '@workspace/types';

export class CreateJoinRequestDto extends createZodDto(
  createJoinRequestSchema,
) {}

export class ApproveJoinRequestDto extends createZodDto(
  approveJoinRequestSchema,
) {}

export class RejectJoinRequestDto extends createZodDto(
  rejectJoinRequestSchema,
) {}

export class SearchClinicsQueryDto extends createZodDto(
  searchClinicsQuerySchema,
) {}
