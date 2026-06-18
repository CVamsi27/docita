import { Inject, Injectable } from '@nestjs/common';
import {
  ApprovalStatus,
  InvoiceStatus,
  LabTestOrderStatus,
  MedicalDocumentStatus,
  MedicalDocumentType,
  AppointmentStatus,
  Role,
} from '@workspace/db';
import type {
  AbdmClinicDashboard,
  AbdmReadinessItem,
  DhisRecordBreakdown,
} from '@workspace/types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';

const DHIS_THRESHOLD = 100;
const CATEGORY_1_FACILITY_RATE_PAISE = 1_000;
const CATEGORY_1_DSC_RATE_PAISE = 500;
const CATEGORY_2_FACILITY_RATE_PAISE = 500;
const CATEGORY_2_DSC_RATE_PAISE = 250;

function getCurrentUtcMonthBounds(now: Date) {
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return {
    monthStart,
    nextMonthStart,
    monthLabel: monthStart.toISOString().slice(0, 7),
  };
}

function calculateEligibleAboveThreshold(category1: number, category2: number) {
  const category2Deducted = Math.min(category2, DHIS_THRESHOLD);
  const remainingDeduction = DHIS_THRESHOLD - category2Deducted;
  const category1Deducted = Math.min(category1, remainingDeduction);
  const category1Eligible = Math.max(0, category1 - category1Deducted);
  const category2Eligible = Math.max(0, category2 - category2Deducted);

  return { category1Eligible, category2Eligible };
}

/**
 * Facade for the ABDM readiness dashboard read model.
 *
 * The endpoint needs one consistent snapshot across clinic settings, patient
 * ABHA status, HFR/HPR readiness, and DHIS record counts. Keeping the
 * orchestration here avoids leaking that dashboard-specific aggregation into
 * controllers while persistence still flows through the clinic port.
 */
@Injectable()
export class ClinicAbdmDashboardService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private readonly persistence: ClinicPersistencePort,
    private readonly integrationsConfig: ExternalIntegrationsConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getDashboard(clinicId: string): Promise<AbdmClinicDashboard> {
    const { monthStart, nextMonthStart, monthLabel } = getCurrentUtcMonthBounds(
      this.clock.now(),
    );

    const verifiedPatientFilter = {
      clinicId,
      deletedAt: null,
      abhaVerifiedAt: { not: null },
    };
    const recordPatientFilter = {
      clinicId,
      deletedAt: null,
      abhaVerifiedAt: { not: null },
    };
    const doctorRoleFilter = {
      clinicId,
      role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
      deletedAt: null,
    };

    const [
      clinic,
      totalPatients,
      abhaVerifiedPatients,
      hprDoctorsConfigured,
      doctorsRequiringHpr,
      diagnosticReports,
      dischargeSummaries,
      prescriptions,
      opConsultations,
      healthDocuments,
      invoices,
    ] = await Promise.all([
      this.persistence.clinic.findUnique({
        where: { id: clinicId },
        select: { abdmEnabled: true, hfrFacilityId: true },
      }),
      this.persistence.patient.count({
        where: { clinicId, deletedAt: null },
      }),
      this.persistence.patient.count({ where: verifiedPatientFilter }),
      this.persistence.user.count({
        where: {
          ...doctorRoleFilter,
          hprId: { not: null },
          NOT: { hprId: '' },
        },
      }),
      this.persistence.user.count({
        where: {
          ...doctorRoleFilter,
          OR: [{ hprId: null }, { hprId: '' }],
        },
      }),
      this.persistence.labTestOrder.count({
        where: {
          clinicId,
          status: {
            in: [LabTestOrderStatus.RESULT_READY, LabTestOrderStatus.COMPLETED],
          },
          patient: recordPatientFilter,
          OR: [
            { completedAt: { gte: monthStart, lt: nextMonthStart } },
            { resultUploadedAt: { gte: monthStart, lt: nextMonthStart } },
          ],
        },
      }),
      this.persistence.medicalDocument.count({
        where: {
          clinicId,
          type: MedicalDocumentType.DISCHARGE_SUMMARY,
          status: MedicalDocumentStatus.SIGNED,
          signedAt: { gte: monthStart, lt: nextMonthStart },
          patient: recordPatientFilter,
        },
      }),
      this.persistence.prescription.count({
        where: {
          clinicId,
          approvalStatus: {
            in: [ApprovalStatus.APPROVED, ApprovalStatus.AUTO_APPROVED],
          },
          date: { gte: monthStart, lt: nextMonthStart },
          patient: recordPatientFilter,
        },
      }),
      this.persistence.appointment.count({
        where: {
          clinicId,
          status: AppointmentStatus.COMPLETED,
          startTime: { gte: monthStart, lt: nextMonthStart },
          patient: recordPatientFilter,
        },
      }),
      this.persistence.medicalDocument.count({
        where: {
          clinicId,
          type: { not: MedicalDocumentType.DISCHARGE_SUMMARY },
          status: MedicalDocumentStatus.SIGNED,
          signedAt: { gte: monthStart, lt: nextMonthStart },
          patient: recordPatientFilter,
        },
      }),
      this.persistence.invoice.count({
        where: {
          clinicId,
          status: InvoiceStatus.PAID,
          OR: [
            { issuedAt: { gte: monthStart, lt: nextMonthStart } },
            { createdAt: { gte: monthStart, lt: nextMonthStart } },
          ],
          patient: recordPatientFilter,
        },
      }),
    ]);

    const breakdown: DhisRecordBreakdown[] = [
      {
        key: 'DIAGNOSTIC_REPORT',
        label: 'Diagnostic Report',
        category: 'CATEGORY_1',
        count: diagnosticReports,
        facilityRatePaise: CATEGORY_1_FACILITY_RATE_PAISE,
        dscRatePaise: CATEGORY_1_DSC_RATE_PAISE,
      },
      {
        key: 'DISCHARGE_SUMMARY',
        label: 'Discharge Summary',
        category: 'CATEGORY_1',
        count: dischargeSummaries,
        facilityRatePaise: CATEGORY_1_FACILITY_RATE_PAISE,
        dscRatePaise: CATEGORY_1_DSC_RATE_PAISE,
      },
      {
        key: 'PRESCRIPTION',
        label: 'Prescription',
        category: 'CATEGORY_2',
        count: prescriptions,
        facilityRatePaise: CATEGORY_2_FACILITY_RATE_PAISE,
        dscRatePaise: CATEGORY_2_DSC_RATE_PAISE,
      },
      {
        key: 'OP_CONSULTATION',
        label: 'OP Consultation',
        category: 'CATEGORY_2',
        count: opConsultations,
        facilityRatePaise: CATEGORY_2_FACILITY_RATE_PAISE,
        dscRatePaise: CATEGORY_2_DSC_RATE_PAISE,
      },
      {
        key: 'HEALTH_DOCUMENT',
        label: 'Health Document',
        category: 'CATEGORY_2',
        count: healthDocuments,
        facilityRatePaise: CATEGORY_2_FACILITY_RATE_PAISE,
        dscRatePaise: CATEGORY_2_DSC_RATE_PAISE,
      },
      {
        key: 'INVOICE',
        label: 'Invoice',
        category: 'CATEGORY_2',
        count: invoices,
        facilityRatePaise: CATEGORY_2_FACILITY_RATE_PAISE,
        dscRatePaise: CATEGORY_2_DSC_RATE_PAISE,
      },
    ];

    const category1Count = diagnosticReports + dischargeSummaries;
    const category2Count =
      prescriptions + opConsultations + healthDocuments + invoices;
    const { category1Eligible, category2Eligible } =
      calculateEligibleAboveThreshold(category1Count, category2Count);
    const recordsAboveThreshold = category1Eligible + category2Eligible;
    const abdmConfig = this.integrationsConfig.getAbdmConfig();
    const abdmEnabled = clinic?.abdmEnabled === true;
    const environmentConfigured = abdmConfig.enabled;
    const callbackSecretConfigured = Boolean(abdmConfig.callbackSecret);
    const hfrFacilityId = clinic?.hfrFacilityId?.trim() || null;
    const hfrConfigured = Boolean(hfrFacilityId);
    const m1Ready =
      abdmEnabled &&
      environmentConfigured &&
      hfrConfigured &&
      abhaVerifiedPatients > 0;
    const registryReady = hfrConfigured && doctorsRequiringHpr === 0;
    const m2InProgress =
      abdmEnabled &&
      environmentConfigured &&
      callbackSecretConfigured &&
      registryReady;

    const readinessItems: AbdmReadinessItem[] = [
      {
        key: 'TENANT_ENABLEMENT',
        label: 'Facility ABDM switch',
        status: abdmEnabled ? 'READY' : 'BLOCKED',
        detail: abdmEnabled
          ? 'ABDM is enabled for this facility.'
          : 'ABDM is off for this facility until you enable it after credentials are available.',
      },
      {
        key: 'PLATFORM_CREDENTIALS',
        label: 'Platform ABDM credentials',
        status: environmentConfigured ? 'READY' : 'BLOCKED',
        detail: environmentConfigured
          ? 'Sandbox or production ABDM credentials are configured.'
          : 'Set ABDM_BASE_URL, ABDM_CLIENT_ID, and ABDM_CLIENT_SECRET for the API environment.',
      },
      {
        key: 'HFR_FACILITY',
        label: 'HFR Facility ID',
        status: hfrConfigured ? 'READY' : 'PENDING',
        detail: hfrConfigured
          ? `Facility registry ID saved: ${hfrFacilityId}`
          : 'Add the facility HFR ID in clinic settings before production ABDM use.',
      },
      {
        key: 'HPR_DOCTORS',
        label: 'Doctor HPR IDs',
        status: doctorsRequiringHpr === 0 ? 'READY' : 'PENDING',
        detail:
          doctorsRequiringHpr === 0
            ? `${hprDoctorsConfigured} doctor profiles have HPR IDs.`
            : `${doctorsRequiringHpr} doctor profiles still need HPR IDs.`,
      },
      {
        key: 'ABHA_VERIFICATION',
        label: 'ABHA verification',
        status: abhaVerifiedPatients > 0 ? 'READY' : 'PENDING',
        detail:
          abhaVerifiedPatients > 0
            ? `${abhaVerifiedPatients} of ${totalPatients} active patients have verified ABHA.`
            : 'Verify at least one patient ABHA from the patient create/edit flow.',
      },
      {
        key: 'CALLBACK_SECURITY',
        label: 'Callback security',
        status: callbackSecretConfigured ? 'READY' : 'BLOCKED',
        detail: callbackSecretConfigured
          ? 'ABDM callbacks require the configured shared secret and replay protection.'
          : 'Set ABDM_CALLBACK_SECRET before enabling ABDM callbacks.',
      },
      {
        key: 'PHI_LOGGING',
        label: 'PHI logging checks',
        status: 'READY',
        detail:
          'ABDM screens and callbacks store operational status without rendering raw gateway PHI in logs or UI errors.',
      },
      {
        key: 'M2_CARE_CONTEXTS',
        label: 'M2 care-context linking',
        status: m2InProgress ? 'PENDING' : 'PLANNED',
        detail: m2InProgress
          ? 'Care-context persistence and callback handling are built; certification remains in progress until sandbox evidence is approved.'
          : 'Enable ABDM and complete platform credentials, callback secret, HFR, and HPR before M2 HIP sandbox evidence.',
      },
      {
        key: 'FHIR_VALIDATION',
        label: 'NRCeS FHIR validation',
        status: m2InProgress ? 'PENDING' : 'PLANNED',
        detail:
          'FHIR bundle generation is available; NRCeS profile validation remains required before claiming M2 readiness.',
      },
      {
        key: 'DHIS_WASA',
        label: 'DHIS and WASA evidence',
        status: 'PENDING',
        detail:
          'Use this dashboard for estimates only until DHIS enrolment, WASA, and ABDM certification evidence are complete.',
      },
    ];

    return {
      abdmEnabled,
      environmentConfigured,
      hfrFacilityId,
      hfrConfigured,
      hprDoctorsConfigured,
      doctorsRequiringHpr,
      abhaVerifiedPatients,
      totalPatients,
      m1Status: m1Ready ? 'READY' : 'PENDING',
      m2Status: m2InProgress ? 'PENDING' : 'PLANNED',
      m3Status: m2InProgress ? 'PENDING' : 'PLANNED',
      readinessItems,
      dhisEstimate: {
        month: monthLabel,
        threshold: DHIS_THRESHOLD,
        totalPotentialRecords: category1Count + category2Count,
        recordsAboveThreshold,
        estimatedFacilityIncentivePaise:
          category1Eligible * CATEGORY_1_FACILITY_RATE_PAISE +
          category2Eligible * CATEGORY_2_FACILITY_RATE_PAISE,
        estimatedDscIncentivePaise:
          category1Eligible * CATEGORY_1_DSC_RATE_PAISE +
          category2Eligible * CATEGORY_2_DSC_RATE_PAISE,
        category1Count,
        category2Count,
        breakdown,
        ratesEffectiveLabel: 'DHIS Corrigendum 7, April 2026 to September 2026',
        sourceLabel:
          'Potential records in Docita; final eligibility depends on ABDM-linked KYC records, M2/M3 role, DHIS enrolment, and NHA policy.',
      },
    };
  }
}
