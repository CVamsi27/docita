import { Controller, Get, Param, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import { AppointmentsApiAccess } from '@/domains/appointments/presentation/controllers/appointments.controller.access';
import { OpdSlipService } from '@/domains/appointments/application/services/opd-slip.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logPatientPhiRead } from '@/shared/modules/audit/audit/patient-access-audit.util';
import { setPrivateNoStoreHeaders } from '@/shared/common/http/private-download-response';

@ApiTags('appointments')
@Controller('appointments')
@AppointmentsApiAccess()
export class OpdSlipController {
  constructor(
    private readonly opdSlipService: OpdSlipService,
    private readonly auditService: AuditService,
  ) {}

  @Get(':id/opd-slip')
  @ApiOperation({ summary: 'Generate a printable OPD prescription slip (PDF)' })
  async getOpdSlip(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ) {
    setPrivateNoStoreHeaders(res);
    const clinicId = requireClinicIdFromRequest(req);
    const { buffer, patientId } = await this.opdSlipService.generatePdf(
      id,
      clinicId,
    );

    await logPatientPhiRead(this.auditService, req, patientId, 'VIEW_HISTORY');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=opd-slip-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
