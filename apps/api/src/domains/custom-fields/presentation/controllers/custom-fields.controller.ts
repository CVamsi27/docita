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
import { CustomFieldsService } from '../../application/services/custom-fields.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldResponseDto,
  CustomFieldListResponseDto,
  CreateCustomFieldSchema,
  UpdateCustomFieldSchema,
} from '../../dto/custom-fields.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { Role } from '@workspace/db';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '../../../../common/types/common.types';

@Controller('custom-fields')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @ZodSerializerDto(CustomFieldListResponseDto)
  findAll(@Request() req: RequestWithUser) {
    return this.customFieldsService.findAll(req.user!.clinicId!);
  }

  @Get(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.customFieldsService.findOne(id, req.user!.clinicId!);
  }

  @Post()
  @ZodSerializerDto(CustomFieldResponseDto)
  @UsePipes(new ZodValidationPipe(CreateCustomFieldSchema))
  create(@Request() req: RequestWithUser, @Body() data: CreateCustomFieldDto) {
    return this.customFieldsService.create({
      ...data,
      clinicId: req.user!.clinicId!,
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
    return this.customFieldsService.update(id, data, req.user!.clinicId!);
  }

  @Delete(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.customFieldsService.remove(id, req.user!.clinicId!);
  }
}
