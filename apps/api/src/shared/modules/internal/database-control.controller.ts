import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@workspace/db';
import { isRecord } from '@workspace/utils';
import { ZodSerializerDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  databaseControlActionHistoryItemSchema,
  databaseControlActionHistoryResponseSchema,
  databaseControlExecuteRequestSchema,
  databaseControlStateResponseSchema,
  type DatabaseControlExecuteRequest,
} from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { InternalApiAccess } from './internal.controller.access';
import {
  DatabaseControlService,
  type AuthenticatedUser,
} from './database-control.service';

// String enums have no reverse mapping, so this is exactly the role strings.
const ROLE_VALUES = Object.values(Role);

function toAuthenticatedUser(user: unknown): AuthenticatedUser {
  if (!isRecord(user)) {
    throw new Error('Authenticated user is required for database control.');
  }
  const role = ROLE_VALUES.find((candidate) => candidate === user['role']);
  return {
    id: String(user['id'] ?? ''),
    email: String(user['email'] ?? ''),
    // The @Roles(Role.INTERNAL) guard runs before this method, so an
    // unmatched role is unreachable in practice; fall back to INTERNAL to
    // preserve the previous cast's lenient behavior.
    role: role ?? Role.INTERNAL,
  };
}

@Controller('internal/database-control')
@InternalApiAccess()
@Roles(Role.INTERNAL)
export class DatabaseControlController {
  constructor(private readonly service: DatabaseControlService) {}

  @Get('state')
  @ZodSerializerDto(databaseControlStateResponseSchema)
  async getState() {
    return this.service.getState();
  }

  @Get('history')
  @ZodSerializerDto(databaseControlActionHistoryResponseSchema)
  async getHistory(@Query('limit') limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 30;
    const safeLimit =
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 200) : 30;
    return { items: await this.service.getHistory(safeLimit) };
  }

  @Post('execute')
  @HttpCode(HttpStatus.ACCEPTED)
  @ZodSerializerDto(
    databaseControlActionHistoryItemSchema.pick({ id: true }).extend({
      actionId: z.string(),
    }),
  )
  async execute(
    @Body() body: DatabaseControlExecuteRequest,
    @Req() request: Request,
  ) {
    // Validate body against the Zod schema. The schema is the source of
    // truth for shape; we re-parse here so the controller rejects bad
    // input before reaching the service.
    const parsed = databaseControlExecuteRequestSchema.parse(body);
    const user = toAuthenticatedUser(request.user);
    const { actionId } = await this.service.execute(parsed, user, request);
    return { actionId };
  }
}
