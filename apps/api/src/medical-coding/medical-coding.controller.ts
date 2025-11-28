import { Controller, Get, Post, Delete, Query, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MedicalCodingService } from './medical-coding.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('medical-coding')
@UseGuards(JwtAuthGuard)
export class MedicalCodingController {
    constructor(private readonly medicalCodingService: MedicalCodingService) { }

    @Get('icd-codes')
    async searchIcdCodes(@Query('search') search: string) {
        return this.medicalCodingService.searchIcdCodes(search);
    }

    @Get('cpt-codes')
    async searchCptCodes(@Query('search') search: string) {
        return this.medicalCodingService.searchCptCodes(search);
    }

    @Get('favorites')
    async getFavorites(@Request() req) {
        return this.medicalCodingService.getFavorites(req.user.id);
    }

    @Post('favorites')
    async addFavorite(@Request() req, @Body('icdCodeId') icdCodeId: string) {
        return this.medicalCodingService.addFavorite(req.user.id, icdCodeId);
    }

    @Delete('favorites/:icdCodeId')
    async removeFavorite(@Request() req, @Param('icdCodeId') icdCodeId: string) {
        return this.medicalCodingService.removeFavorite(req.user.id, icdCodeId);
    }

    // CPT Favorites
    @Get('cpt-favorites')
    async getCptFavorites(@Request() req) {
        return this.medicalCodingService.getCptFavorites(req.user.id);
    }

    @Post('cpt-favorites')
    async addCptFavorite(@Request() req, @Body('cptCodeId') cptCodeId: string) {
        return this.medicalCodingService.addCptFavorite(req.user.id, cptCodeId);
    }

    @Delete('cpt-favorites/:cptCodeId')
    async removeCptFavorite(@Request() req, @Param('cptCodeId') cptCodeId: string) {
        return this.medicalCodingService.removeCptFavorite(req.user.id, cptCodeId);
    }

    @Get('uncoded')
    async getUncodedVisits(@Request() req) {
        // Assuming user has clinicId, or we get it from request
        // For now, using a placeholder or getting from user if available
        // In a real app, we'd check user's clinic
        return this.medicalCodingService.getUncodedVisits(req.user.clinicId);
    }
}
