import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { PublicPatientDocumentsService } from './public-patient-documents.service';
import { setPrivateNoStoreHeaders } from '@/shared/common/http/private-download-response';

@Controller('public/patient')
export class PublicPatientDocumentsController {
  constructor(
    private readonly publicPatientDocuments: PublicPatientDocumentsService,
  ) {}

  @Get('rx/:token/pdf')
  @Public()
  async getPrescriptionPdf(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ipAddress = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const userAgent = req.headers?.['user-agent'] ?? 'unknown';

    try {
      const result = await this.publicPatientDocuments.getPrescriptionPdf(
        token,
        ipAddress,
        userAgent,
      );

      setPrivateNoStoreHeaders(res);
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length,
      });
      res.end(result.buffer);
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
        });
        return;
      }

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

  @Get('inv/:token/pdf')
  @Public()
  async getInvoicePdf(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const ipAddress = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const userAgent = req.headers?.['user-agent'] ?? 'unknown';

    try {
      const result = await this.publicPatientDocuments.getInvoicePdf(
        token,
        ipAddress,
        userAgent,
      );

      setPrivateNoStoreHeaders(res);
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length,
      });
      res.end(result.buffer);
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
        });
        return;
      }

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

  @Get('pay/:token')
  @Public()
  async redirectToPayment(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.publicPatientDocuments.resolvePaymentRedirectUrl(token);
    res.redirect(HttpStatus.FOUND, redirectUrl);
  }
}
