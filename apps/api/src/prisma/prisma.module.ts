import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CommonModule } from '../common/common.module';

@Global()
@Module({
  imports: [CommonModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
