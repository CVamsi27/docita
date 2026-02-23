import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  Request,
  UsePipes,
  NotFoundException,
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

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('templates')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateTemplateSchema))
  create(
    @Request() req: AuthRequest,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    return this.templatesService.create({
      ...createTemplateDto,
      clinicId: req.user.clinicId,
    });
  }

  @Get()
  findAll(
    @Request() req: AuthRequest,
    @Query('search') search?: string,
    @Query('speciality') speciality?: string,
  ) {
    return this.templatesService.findAll({
      search,
      speciality,
      clinicId: req.user.clinicId,
    });
  }

  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    const template = await this.templatesService.findOne(id);
    if (!template || template.clinicId !== req.user.clinicId) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(UpdateTemplateSchema))
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    const template = await this.templatesService.findOne(id);
    if (!template || template.clinicId !== req.user.clinicId) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    const template = await this.templatesService.findOne(id);
    if (!template || template.clinicId !== req.user.clinicId) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.templatesService.remove(id);
  }
}
