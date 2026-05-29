import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PublicPatientDocumentsService } from './public-patient-documents.service';

@Controller('public/patient')
export class PublicPatientDocumentsController {
  constructor(
    private readonly publicPatientDocuments: PublicPatientDocumentsService,
  ) {}

  @Get('rx/:token/pdf')
  @Public()
  async getPrescriptionPdf(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.streamPdf(
      () => this.publicPatientDocuments.getPrescriptionPdf(token),
      res,
    );
  }

  @Get('inv/:token/pdf')
  @Public()
  async getInvoicePdf(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.streamPdf(
      () => this.publicPatientDocuments.getInvoicePdf(token),
      res,
    );
  }

  @Get('pay/:token')
  @Public()
  async redirectToPayment(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl =
      await this.publicPatientDocuments.resolvePaymentRedirectUrl(token);
    res.redirect(HttpStatus.FOUND, redirectUrl);
  }

  private async streamPdf(
    load: () => Promise<
      | { type: 'redirect'; url: string }
      | { type: 'buffer'; buffer: Buffer; filename: string }
    >,
    res: Response,
  ): Promise<void> {
    try {
      const result = await load();

      if (result.type === 'redirect') {
        res.redirect(HttpStatus.FOUND, result.url);
        return;
      }

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length,
        'Cache-Control': 'private, no-store',
      });
      res.end(result.buffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
        });
        return;
      }

      throw error;
    }
  }
}
