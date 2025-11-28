import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ClinicsService } from './clinics.service';

@Controller('clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  create(@Body() data: any) {
    return this.clinicsService.create(data);
  }

  @Get()
  findAll() {
    return this.clinicsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clinicsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.clinicsService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.clinicsService.delete(id);
  }

  @Get('user/:userId')
  getUserClinics(@Param('userId') userId: string) {
    return this.clinicsService.getUserClinics(userId);
  }

  @Get(':id/stats')
  getClinicStats(@Param('id') id: string) {
    return this.clinicsService.getClinicStats(id);
  }
}
