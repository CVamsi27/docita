/* eslint-disable */
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Res } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import type { Response } from 'express';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) { }

  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  create(@Body() createInvoiceDto: any) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvoiceDto: any) {
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
