import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldResponseDto,
  CustomFieldListResponseDto,
} from './dto/custom-fields.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('custom-fields')
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
  create(@Body() data: CreateCustomFieldDto) {
    return this.customFieldsService.create(data);
  }

  @Put(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  update(@Param('id') id: string, @Body() data: UpdateCustomFieldDto) {
    return this.customFieldsService.update(id, data);
  }

  @Delete(':id')
  @ZodSerializerDto(CustomFieldResponseDto)
  remove(@Param('id') id: string) {
    return this.customFieldsService.remove(id);
  }
}
