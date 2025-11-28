import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireTier, Tier } from '../auth/tier.decorator';
import { PrescriptionTemplatesService } from './prescription-templates.service';

@Controller('prescription-templates')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireTier(Tier.STARTER) // Prescription templates require Starter tier
export class PrescriptionTemplatesController {
    constructor(
        private readonly prescriptionTemplatesService: PrescriptionTemplatesService,
    ) { }

    @Get()
    async findAll(@Request() req) {
        return this.prescriptionTemplatesService.findAll(req.user.userId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.prescriptionTemplatesService.findOne(id);
    }

    @Post()
    async create(@Request() req, @Body() createDto: any) {
        return this.prescriptionTemplatesService.create(
            req.user.userId,
            createDto,
        );
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateDto: any) {
        return this.prescriptionTemplatesService.update(id, updateDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.prescriptionTemplatesService.remove(id);
    }
}
