import { Controller, Get, Query } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { InternalLogService } from './internal-log.service';
import { InternalLogListResponseDto } from './dto/internal.dto';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { InternalApiAccess } from './internal.controller.access';

@Controller('internal')
@InternalApiAccess()
export class InternalLogsController {
  constructor(private readonly logService: InternalLogService) {}

  @Get('logs')
  @ZodSerializerDto(InternalLogListResponseDto)
  async getLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('level') level?: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG',
    @Query('module') module?: string,
    @Query('q') q?: string,
  ) {
    const parsedLimit = parsePaginationInt(limit, { min: 1, max: 500 }) ?? 50;
    const parsedOffset = parsePaginationInt(offset, { min: 0 }) ?? 0;
    return this.logService.getLogs(parsedLimit, parsedOffset, {
      level,
      module,
      q,
    });
  }
}
