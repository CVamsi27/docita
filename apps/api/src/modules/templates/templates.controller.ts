import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/templates.dto';

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
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateTemplateSchema))
  create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('speciality') speciality?: string,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.templatesService.findAll({
      search,
      speciality,
      clinicId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(UpdateTemplateSchema))
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
