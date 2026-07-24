import { Injectable, Logger, Inject } from '@nestjs/common';
import { DoctorVerificationStatus, Role } from '@workspace/db';
import { JsonValue } from '@workspace/types';
import { DATE_FORMATS, formatDate } from '@workspace/utils';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { runWithTenant } from '@/shared/common/middleware/tenant.middleware';
import {
  IDoctorVerificationRepository,
  DOCTOR_VERIFICATION_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/doctor-verification.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { DoctorVerificationHttpClient } from '@/domains/doctors/infrastructure/external/doctor-verification-http.client';

type VerificationResult = {
  status: DoctorVerificationStatus;
  source: string;
  reference?: string;
  reason?: string;
  data?: JsonValue;
};

type VerificationProviderResponse = {
  verified?: boolean;
  referenceId?: string;
  reason?: string;
  source?: string;
  status?: string;
  data?: JsonValue;
};

/** Verification uses the configured HTTP provider; extend with jurisdiction-specific logic when council APIs are integrated. */
@Injectable()
export class DoctorVerificationService {
  private readonly logger = new Logger(DoctorVerificationService.name);

  constructor(
    @Inject(DOCTOR_VERIFICATION_REPOSITORY_TOKEN)
    private readonly repository: IDoctorVerificationRepository,
    private readonly configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly verificationHttp: DoctorVerificationHttpClient,
  ) {}

  async verifyAndPersistDoctorVerification(doctorId: string) {
    const doctor = await this.repository.findDoctorForVerification(doctorId);

    if (!doctor) return null;

    if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR)
      return null;

    if (!doctor.registrationNumber) {
      await this.repository.updateVerificationStatus(doctorId, {
        verificationStatus: DoctorVerificationStatus.UNVERIFIED,
        verificationSource: 'NMC',
        verificationReason: 'Registration number is required',
        verificationRef: null,
        verificationCheckedAt: this.clock.now(),
      });

      return this.repository.findDoctorVerificationRecord(doctorId);
    }

    await this.repository.updateVerificationStatus(doctorId, {
      verificationStatus: DoctorVerificationStatus.PENDING,
      verificationSource: 'NMC',
      verificationReason: null,
      verificationCheckedAt: this.clock.now(),
    });

    const result = await this.verifyWithProvider({
      id: doctor.id,
      name: doctor.name,
      registrationNumber: doctor.registrationNumber,
      registrationCouncil: doctor.registrationCouncil ?? undefined,
      registrationStateCode: doctor.registrationStateCode ?? undefined,
      licenseNumber: doctor.licenseNumber ?? undefined,
    });

    await this.repository.updateVerificationStatus(doctorId, {
      verificationStatus: result.status,
      verificationSource: result.source,
      verificationRef: result.reference ?? null,
      verificationReason: result.reason ?? null,
      verificationData: result.data,
      verificationCheckedAt: this.clock.now(),
    });

    return this.repository.findDoctorVerificationRecord(doctorId);
  }

  async runDoctorReverificationSweep(): Promise<void> {
    await runWithTenant({ bypassed: true }, async () => {
      const doctors = await this.repository.findDoctorsForReverification();

      const results = await Promise.allSettled(
        doctors.map((doctor) =>
          this.verifyAndPersistDoctorVerification(doctor.id),
        ),
      );

      const failures: PromiseRejectedResult[] = [];
      for (const result of results) {
        if (result.status === 'rejected') {
          failures.push(result);
        }
      }
      if (failures.length > 0) {
        // Surface but don't rethrow — the cron will retry the whole
        // batch on the next tick. Logging each keeps failures visible
        // without aborting the run.
        this.logger.error(
          `Nightly re-verification: ${failures.length} of ${results.length} doctor(s) failed`,
          failures.map((f) => f.reason).join('\n'),
        );
      }
    });
  }

  private async checkLicenseExpiry(
    doctorId: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const doctor = await this.repository.findDoctorLicenseExpiry(doctorId);

    if (!doctor?.licenseExpiry) {
      return { valid: true };
    }

    const now = this.clock.now();
    const expiryDate = new Date(doctor.licenseExpiry);

    if (expiryDate < now) {
      return {
        valid: false,
        reason: `Medical license expired on ${formatDate(
          expiryDate,
          DATE_FORMATS.DATE_MEDIUM,
        )}`,
      };
    }

    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry <= 30) {
      this.logger.warn(
        `License expiring soon for doctor ${doctorId}: ${daysUntilExpiry} days remaining`,
      );
    }

    return { valid: true };
  }

  private async verifyWithProvider(input: {
    id: string;
    name: string;
    registrationNumber: string;
    registrationCouncil?: string;
    registrationStateCode?: string;
    licenseNumber?: string;
  }): Promise<VerificationResult> {
    const licenseCheck = await this.checkLicenseExpiry(input.id);
    if (!licenseCheck.valid) {
      return {
        status: DoctorVerificationStatus.REJECTED,
        source: 'LICENSE_CHECK',
        reason: licenseCheck.reason,
      };
    }

    const hprResult = await this.tryHprVerification(input);
    if (hprResult) return hprResult;

    const { apiUrl, apiKey } = this.configService.getDoctorVerificationConfig();

    if (!apiUrl) {
      this.logger.log(
        `Doctor verification queued for admin review (no automated provider configured) for ${input.id}`,
      );
      return {
        status: DoctorVerificationStatus.PENDING,
        source: 'MANUAL_ADMIN',
        reason:
          'Your registration is being reviewed by our team. This usually takes 1–2 business days.',
      };
    }

    try {
      const {
        ok,
        status,
        json: payload,
      } = await this.verificationHttp.postJson<VerificationProviderResponse>(
        apiUrl,
        {
          doctorId: input.id,
          name: input.name,
          registrationNumber: input.registrationNumber,
          registrationCouncil: input.registrationCouncil,
          registrationStateCode: input.registrationStateCode,
          licenseNumber: input.licenseNumber,
        },
        {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        },
      );

      if (!ok) {
        this.logger.warn(
          `Doctor verification provider returned HTTP ${status}`,
        );
        return {
          status: DoctorVerificationStatus.FAILED,
          source: 'NMC',
          reason:
            'Registration verification is temporarily unavailable. Please try again later.',
        };
      }

      if (payload.verified) {
        return {
          status: DoctorVerificationStatus.VERIFIED,
          source: payload.source || 'NMC',
          reference: payload.referenceId,
          data: payload.data,
        };
      }

      return {
        status:
          payload.status === 'FAILED'
            ? DoctorVerificationStatus.FAILED
            : DoctorVerificationStatus.REJECTED,
        source: payload.source || 'NMC',
        reference: payload.referenceId,
        reason: payload.reason || 'Registration could not be verified',
        data: payload.data,
      };
    } catch (error) {
      this.logger.warn(
        `Doctor verification request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return {
        status: DoctorVerificationStatus.FAILED,
        source: 'NMC',
        reason:
          'Registration verification is temporarily unavailable. Please try again later.',
      };
    }
  }

  // ABDM Healthcare Professionals Registry: returns null when no credentials
  // are configured so the call falls through to the configured HTTP provider
  // or the admin review queue.
  private async tryHprVerification(input: {
    id: string;
    registrationNumber: string;
    registrationCouncil?: string;
    registrationStateCode?: string;
  }): Promise<VerificationResult | null> {
    const { hprApiUrl, hprApiKey } =
      this.configService.getHprVerificationConfig();
    if (!hprApiUrl || !hprApiKey) return null;

    try {
      const {
        ok,
        status,
        json: payload,
      } = await this.verificationHttp.postJson<{
        matched?: boolean;
        hpid?: string;
        data?: JsonValue;
      }>(
        `${hprApiUrl}/v1/practitioner/search`,
        {
          registrationNumber: input.registrationNumber,
          stateMedicalCouncil:
            input.registrationCouncil ?? input.registrationStateCode,
        },
        {
          headers: { Authorization: `Bearer ${hprApiKey}` },
        },
      );

      if (!ok) {
        this.logger.warn(`HPR lookup HTTP ${status} for ${input.id}`);
        return null;
      }

      if (!payload.matched) return null;

      return {
        status: DoctorVerificationStatus.VERIFIED,
        source: 'HPR',
        reference: payload.hpid,
        data: payload.data,
      };
    } catch (error) {
      this.logger.warn(
        `HPR lookup failed for ${input.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }
}
