// jscpd:ignore-start
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UsePipes,
} from '@nestjs/common';
import { CustomFieldsService } from '@/domains/custom-fields/application/services/custom-fields.service';
import {
  CreateCustomFieldDto,
  // jscpd:ignore-end
  UpdateCustomFieldDto,
  CustomFieldResponseDto,
  CustomFieldListResponseDto,
  CreateCustomFieldSchema,
  UpdateCustomFieldSchema,
} from '@/domains/custom-fields/application/dto/custom-fields.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';

@Controller('custom-fields')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @ZodSerializerDto(CustomFieldListResponseDto)
  findAll(@Request() req: RequestWithUser) {
    return this.customFieldsService.findAll(requireClinicIdFromRequest(req));
  }

  @Get(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.customFieldsService.findOne(
      id,
      requireClinicIdFromRequest(req),
    );
  }

  @Post()
  @ZodSerializerDto(CustomFieldResponseDto)
  @UsePipes(new ZodValidationPipe(CreateCustomFieldSchema))
  create(@Request() req: RequestWithUser, @Body() data: CreateCustomFieldDto) {
    return this.customFieldsService.create({
      ...data,
      clinicId: requireClinicIdFromRequest(req),
    });
  }

  @Put(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateCustomFieldSchema))
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() data: UpdateCustomFieldDto,
  ) {
    return this.customFieldsService.update(
      id,
      data,
      requireClinicIdFromRequest(req),
    );
  }

  @Delete(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.customFieldsService.remove(id, requireClinicIdFromRequest(req));
  }
}
