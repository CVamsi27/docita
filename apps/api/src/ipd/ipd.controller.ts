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
import { FacilityType } from '@workspace/types';
import { FacilityTypeGuard } from '../auth/clinic-type.guard';
import { RequireFacilityType } from '../auth/clinic-type.decorator';
import {
  CreateWardDto,
  CreateRoomDto,
  CreateBedDto,
  UpdateBedStatusDto,
  AdmitPatientDto,
  WardListResponseDto,
  WardResponseDto,
  RoomResponseDto,
  BedResponseDto,
  AdmissionResponseDto,
} from './dto/ipd.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('ipd')
@UseGuards(JwtAuthGuard, FacilityTypeGuard)
@RequireFacilityType(FacilityType.HOSPITAL)
export class IpdController {
  constructor(private readonly ipdService: IpdService) {}

  @Get('wards')
  @ZodSerializerDto(WardListResponseDto)
  findAllWards(@Request() req: AuthRequest, @Query('search') search?: string) {
    return this.ipdService.findAllWards(req.user.clinicId, search);
  }

  @Post('wards')
  @ZodSerializerDto(WardResponseDto)
  createWard(@Request() req: AuthRequest, @Body() dto: CreateWardDto) {
    return this.ipdService.createWard({
      ...dto,
      clinicId: req.user.clinicId,
    } as any);
  }

  @Post('rooms')
  @ZodSerializerDto(RoomResponseDto)
  createRoom(@Body() dto: CreateRoomDto) {
    return this.ipdService.createRoom(dto);
  }

  @Post('beds')
  @ZodSerializerDto(BedResponseDto)
  createBed(@Body() dto: CreateBedDto) {
    return this.ipdService.createBed(dto);
  }

  @Patch('beds/:id/status')
  @ZodSerializerDto(BedResponseDto)
  updateBedStatus(@Param('id') id: string, @Body() dto: UpdateBedStatusDto) {
    return this.ipdService.updateBedStatus(id, dto.status as any);
  }

  @Post('admissions')
  @ZodSerializerDto(AdmissionResponseDto)
  admitPatient(@Body() dto: AdmitPatientDto) {
    return this.ipdService.admitPatient(dto as any);
  }

  @Patch('admissions/:id/discharge')
  @ZodSerializerDto(AdmissionResponseDto)
  dischargePatient(@Param('id') id: string) {
    return this.ipdService.dischargePatient(id);
  }
}
