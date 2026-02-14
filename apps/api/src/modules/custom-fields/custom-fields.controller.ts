import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UsePipes,
} from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldResponseDto,
  CustomFieldListResponseDto,
  CreateCustomFieldSchema,
  UpdateCustomFieldSchema,
} from './dto/custom-fields.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';

@Controller('custom-fields')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.SUPER_ADMIN)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  @ZodSerializerDto(CustomFieldListResponseDto)
  findAll() {
    return this.customFieldsService.findAll();
  }

  @Get(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  findOne(@Param('id') id: string) {
    return this.customFieldsService.findOne(id);
  }

  @Post()
  @ZodSerializerDto(CustomFieldResponseDto)
  @UsePipes(new ZodValidationPipe(CreateCustomFieldSchema))
  create(@Body() data: CreateCustomFieldDto) {
    return this.customFieldsService.create(data);
  }

  @Put(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateCustomFieldSchema))
  update(@Param('id') id: string, @Body() data: UpdateCustomFieldDto) {
    return this.customFieldsService.update(id, data);
  }

  @Delete(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  remove(@Param('id') id: string) {
    return this.customFieldsService.remove(id);
  }
}
