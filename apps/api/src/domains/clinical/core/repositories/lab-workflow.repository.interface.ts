export interface LabQueueQueryParams {
  labId?: string;
  status?: string;
  search?: string;
}

export interface LabQueueItem {
  id: string;
  clinicId: string;
  labId: string | null;
  status: string;
  notes: string | null;
  resultUrl: string | null;
  resultUploadedAt: Date | null;
  collectedAt: Date | null;
  completedAt: Date | null;
  paidAt: Date | null;
  paymentMethod: string | null;
  releasedAt: Date | null;
  createdAt: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
  labTest: {
    id: string;
    name: string;
    specimenType: string | null;
  };
}

export interface LabOrderReleaseContext {
  id: string;
  clinicId: string;
  status: string;
  resultUrl: string | null;
  paidAt: Date | null;
  testName: string;
  clinicName: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
}

export interface LabWorkflowRepository {
  findLabQueue(
    clinicId: string,
    params?: LabQueueQueryParams,
  ): Promise<LabQueueItem[]>;
  findReleaseContext(
    id: string,
    clinicId: string,
  ): Promise<LabOrderReleaseContext | null>;
  markSampleCollected(
    id: string,
    clinicId: string,
    notes: string | undefined,
    now: Date,
  ): Promise<void>;
  attachResult(
    id: string,
    clinicId: string,
    data: {
      resultUrl: string;
      result?: Record<string, unknown>;
      notes?: string;
      uploadedBy: string;
    },
    now: Date,
  ): Promise<void>;
  verifyPayment(
    id: string,
    clinicId: string,
    data: { method: string; reference?: string; verifiedBy: string },
    now: Date,
  ): Promise<void>;
  markReleased(id: string, clinicId: string, now: Date): Promise<void>;
}
