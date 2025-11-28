import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';

interface TemplateField {
  id: string;
  label: string;
  type: string;
  options?: string[];
}

interface CreateTemplateDto {
  name: string;
  speciality: string;
  fields: TemplateField[];
  defaultObservations?: string;
  clinicId?: string;
}

interface UpdateTemplateDto {
  name?: string;
  speciality?: string;
  fields?: TemplateField[];
  defaultObservations?: string;
}

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
