import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { PostgresQueueService } from '@/shared/modules/queue/postgres-queue.service';
import type { IQueueProvider } from '@/shared/modules/queue/queue.interface';

interface DlqQueryDto {
  queue: string;
  limit?: string;
}

@Controller('internal/dlq')
@ApiTags('Internal - Dead Letter Queue')
@Roles(Role.INTERNAL)
@ApiBearerAuth()
export class DlqController {
  constructor(@Inject('queue') private readonly queue: IQueueProvider) {}

  private requirePostgresBackend(): PostgresQueueService {
    if (!(this.queue instanceof PostgresQueueService)) {
      throw new NotFoundException(
        'DLQ inspection is only available with the postgres queue backend',
      );
    }
    return this.queue;
  }

  @Get()
  @ApiOperation({ summary: 'List dead-lettered jobs for a given queue' })
  async list(@Query() query: DlqQueryDto) {
    const queue = this.requirePostgresBackend();
    const limit = Math.min(
      Math.max(parseInt(query.limit ?? '50', 10) || 50, 1),
      200,
    );
    return queue.listDeadLettered(query.queue, limit);
  }

  @Post('replay/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replay a dead-lettered job' })
  async replay(@Param('id') id: string, @Body() _body: unknown) {
    const queue = this.requirePostgresBackend();
    return queue.replayDeadLettered(id);
  }
}
