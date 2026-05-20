import { Injectable } from '@nestjs/common';
import { type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class SystemClockService implements IClock {
  now(): Date {
    return new Date();
  }
}
