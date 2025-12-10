import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

interface CreateInvoiceDto {
  appointmentId?: string;
  patientId: string;
  total: number;
  status: string;
  items: InvoiceItem[];
  // Doctor context for audit trail (Phase 5)
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: string;
  doctorRole?: string;
  doctorRegistrationNumber?: string;
  doctorLicenseNumber?: string;
}

interface UpdateInvoiceDto {
  status?: string;
  total?: number;
  items?: InvoiceItem[];
}

@Controller('invoices')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.INVOICING)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.invoicesService.findAll(req.user.clinicId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, updateInvoiceDto);
  }

  @Get(':id/pdf')
  async generatePDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.invoicesService.generatePDF(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${id}.pdf`,
    );
    res.send(pdfBuffer);
  }
}
