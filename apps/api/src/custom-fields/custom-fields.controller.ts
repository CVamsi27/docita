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

@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  findAll() {
    return this.customFieldsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customFieldsService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.customFieldsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.customFieldsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customFieldsService.remove(id);
  }
}
