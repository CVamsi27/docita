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
  ForbiddenException,
} from '@nestjs/common';
import { TemplatesService } from '@/domains/documents/application/services/templates.service';
import { Role } from '@workspace/db';
import { Feature } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  CreateTemplateDto,
  UpdateTemplateDto,
  ListTemplatesQueryDto,
} from '@/domains/documents/application/dto/templates.dto';
import { RequestWithUser } from '@/shared/common/types/common.types';

@Controller('templates')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
@RequireFeature(Feature.PRESCRIPTION_TEMPLATES)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateTemplateSchema))
  create(
    @Request() req: RequestWithUser,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    if (!req.user?.clinicId) {
      throw new ForbiddenException('Clinic ID not found');
    }
    return this.templatesService.create({
      ...createTemplateDto,
      clinicId: req.user.clinicId,
    });
  }

  @Get()
  findAll(
    @Request() req: RequestWithUser,
    @Query() query?: ListTemplatesQueryDto,
  ) {
    const { search, speciality } = query ?? {};
    if (!req.user?.clinicId) {
      throw new ForbiddenException('Clinic ID not found');
    }
    return this.templatesService.findAll({
      search,
      speciality,
      clinicId: req.user.clinicId,
    });
  }

  @Get(':id')
  async findOne(@Request() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user?.clinicId) {
      throw new ForbiddenException('Clinic ID not found');
    }
    const template = await this.templatesService.findOne(id);
    if (!template || template.clinicId !== req.user.clinicId) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(UpdateTemplateSchema))
  async update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    if (!req.user?.clinicId) {
      throw new ForbiddenException('Clinic ID not found');
    }
    const template = await this.templatesService.findOne(id);
    if (!template || template.clinicId !== req.user.clinicId) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  async remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user?.clinicId) {
      throw new ForbiddenException('Clinic ID not found');
    }
    const template = await this.templatesService.findOne(id);
    if (!template || template.clinicId !== req.user.clinicId) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return this.templatesService.remove(id);
  }
}
