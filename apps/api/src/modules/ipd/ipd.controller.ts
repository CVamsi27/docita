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
  UsePipes,
} from '@nestjs/common';
import { IpdService } from './ipd.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FacilityType } from '@workspace/types';
import { FacilityTypeGuard } from '../auth/clinic-type.guard';
import { RequireFacilityType } from '../auth/clinic-type.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, BedStatus } from '@workspace/db';
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
  CreateWardSchema,
  CreateRoomSchema,
  CreateBedSchema,
  UpdateBedStatusSchema,
  AdmitPatientSchema,
} from './dto/ipd.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('ipd')
@UseGuards(JwtAuthGuard, RolesGuard, FacilityTypeGuard)
@RequireFacilityType(FacilityType.HOSPITAL)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class IpdController {
  constructor(private readonly ipdService: IpdService) {}

  @Get('wards')
  @ZodSerializerDto(WardListResponseDto)
  findAllWards(@Request() req: AuthRequest, @Query('search') search?: string) {
    return this.ipdService.findAllWards(req.user.clinicId, search);
  }

  @Post('wards')
  @ZodSerializerDto(WardResponseDto)
  @UsePipes(new ZodValidationPipe(CreateWardSchema))
  createWard(@Request() req: AuthRequest, @Body() dto: CreateWardDto) {
    return this.ipdService.createWard({
      ...dto,
      clinicId: req.user.clinicId,
    } as unknown as import('@workspace/types').CreateWardDto);
  }

  @Post('rooms')
  @ZodSerializerDto(RoomResponseDto)
  @UsePipes(new ZodValidationPipe(CreateRoomSchema))
  createRoom(@Request() req: AuthRequest, @Body() dto: CreateRoomDto) {
    return this.ipdService.createRoom(dto, req.user.clinicId);
  }

  @Post('beds')
  @ZodSerializerDto(BedResponseDto)
  @UsePipes(new ZodValidationPipe(CreateBedSchema))
  createBed(@Request() req: AuthRequest, @Body() dto: CreateBedDto) {
    return this.ipdService.createBed(dto, req.user.clinicId);
  }

  @Patch('beds/:id/status')
  @ZodSerializerDto(BedResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateBedStatusSchema))
  updateBedStatus(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBedStatusDto,
  ) {
    return this.ipdService.updateBedStatus(
      id,
      dto.status as BedStatus,
      req.user.clinicId,
    );
  }

  @Post('admissions')
  @ZodSerializerDto(AdmissionResponseDto)
  @UsePipes(new ZodValidationPipe(AdmitPatientSchema))
  admitPatient(@Request() req: AuthRequest, @Body() dto: AdmitPatientDto) {
    return this.ipdService.admitPatient(
      dto as unknown as import('@workspace/types').AdmitPatientDto,
      req.user.clinicId,
    );
  }

  @Patch('admissions/:id/discharge')
  @ZodSerializerDto(AdmissionResponseDto)
  dischargePatient(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.ipdService.dischargePatient(id, req.user.clinicId);
  }
}
