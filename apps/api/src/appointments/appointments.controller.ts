import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { appointmentSchema } from '@workspace/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll() {
    return this.appointmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @UsePipes(
    new ZodValidationPipe(
      appointmentSchema.omit({ id: true, createdAt: true, updatedAt: true }),
    ),
  )
  create(@Body() createAppointmentDto: any) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  @Patch(':id')
  @UsePipes(
    new ZodValidationPipe(
      appointmentSchema
        .partial()
        .omit({ id: true, createdAt: true, updatedAt: true }),
    ),
  )
  update(@Param('id') id: string, @Body() updateAppointmentDto: any) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }

  @Post(':id/vitals')
  createVitals(@Param('id') id: string, @Body() vitalsDto: any) {
    return this.appointmentsService.createVitals(id, vitalsDto);
  }
}
