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
import { PatientsService } from './patients.service';
import { patientSchema } from '@workspace/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('patients')
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Get()
    findAll() {
        return this.patientsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.patientsService.findOne(id);
    }

    @Post()
    @UsePipes(new ZodValidationPipe(patientSchema.omit({ id: true, createdAt: true, updatedAt: true })))
    create(@Body() createPatientDto: any) {
        return this.patientsService.create(createPatientDto);
    }

    @Patch(':id')
    @UsePipes(new ZodValidationPipe(patientSchema.partial().omit({ id: true, createdAt: true, updatedAt: true })))
    update(@Param('id') id: string, @Body() updatePatientDto: any) {
        return this.patientsService.update(id, updatePatientDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.patientsService.remove(id);
    }

    @Get(':id/appointments')
    getPatientAppointments(@Param('id') id: string) {
        return this.patientsService.getAppointments(id);
    }

    @Get(':id/documents')
    getPatientDocuments(@Param('id') id: string) {
        return this.patientsService.getDocuments(id);
    }
}
