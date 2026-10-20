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
  resultNotificationStatus: string;
  resultNotificationAttempts: number;
  resultNotifiedAt: Date | null;
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
  releasedAt: Date | null;
  resultNotificationStatus: string;
  resultNotificationAttempts: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
  };
}

/**
 * Claim leases. Both are time-bounded so a crashed holder does not strand the
 * work: a release or a notification whose claim is older than the lease can be
 * taken over, because the previous holder provably did not finish.
 */
export interface LabReleaseClaim {
  id: string;
  clinicId: string;
  claimToken: string;
  now: Date;
  releasedBy: string;
}

export interface LabNotificationClaim {
  id: string;
  clinicId: string;
  claimToken: string;
  now: Date;
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

  /**
   * Atomically takes ownership of releasing this order.
   *
   * Returns true for exactly one caller per order: the update is predicated on
   * the order still being in a non-terminal state with no active claim, so a
   * concurrent release — including the auto-release triggered by a concurrent
   * payment verification — writes nothing and must abandon its notification.
   */
  claimRelease(claim: LabReleaseClaim): Promise<boolean>;

  /**
   * Atomically takes ownership of delivering the result notification.
   *
   * Returns false when the notification is already SENT/SKIPPED, when another
   * live claim holds it, or when the order was never released under the claim
   * token passed in.
   */
  claimResultNotification(
    claim: LabNotificationClaim,
    leaseExpiredBefore: Date,
  ): Promise<boolean>;

  /** Records the delivery outcome, gated on this caller's claim. */
  completeResultNotification(
    id: string,
    clinicId: string,
    claimToken: string,
    outcome: {
      status: 'SENT' | 'FAILED' | 'SKIPPED_NO_CONTACT';
      now: Date;
      error?: string;
    },
  ): Promise<void>;

  /**
   * Released orders whose notification has not settled, including SENDING
   * leases that expired (the holder died mid-send). Oldest release first.
   */
  findPendingResultNotifications(
    leaseExpiredBefore: Date,
    limit: number,
  ): Promise<Array<{ id: string; clinicId: string }>>;
}
