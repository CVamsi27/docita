import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IpdService } from './ipd.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BedStatus, FacilityType } from '@workspace/types';
import { FacilityTypeGuard } from '../auth/clinic-type.guard';
import { RequireFacilityType } from '../auth/clinic-type.decorator';
import {
  CreateWardDto,
  CreateRoomDto,
  CreateBedDto,
  UpdateBedStatusDto,
  AdmitPatientDto,
} from './dto/ipd.dto';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('ipd')
@UseGuards(JwtAuthGuard, FacilityTypeGuard)
@RequireFacilityType(FacilityType.HOSPITAL)
export class IpdController {
  constructor(private readonly ipdService: IpdService) { }

  @Get('wards')
  findAllWards(
    @Request() req: AuthRequest,
    @Query('search') search?: string,
  ) {
    return this.ipdService.findAllWards(req.user.clinicId, search);
  }

  @Post('wards')
  createWard(@Request() req: AuthRequest, @Body() dto: CreateWardDto) {
    return this.ipdService.createWard({
      ...dto,
      clinicId: req.user.clinicId,
    });
  }

  @Post('rooms')
  createRoom(@Body() dto: CreateRoomDto) {
    return this.ipdService.createRoom(dto);
  }

  @Post('beds')
  createBed(@Body() dto: CreateBedDto) {
    return this.ipdService.createBed(dto);
  }

  @Patch('beds/:id/status')
  updateBedStatus(@Param('id') id: string, @Body() dto: UpdateBedStatusDto) {
    return this.ipdService.updateBedStatus(id, dto.status);
  }

  @Post('admissions')
  admitPatient(@Body() dto: AdmitPatientDto) {
    return this.ipdService.admitPatient(dto);
  }

  @Patch('admissions/:id/discharge')
  dischargePatient(@Param('id') id: string) {
    return this.ipdService.dischargePatient(id);
  }
}
