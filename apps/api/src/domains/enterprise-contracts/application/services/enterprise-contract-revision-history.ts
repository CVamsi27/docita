import { type EnterpriseContract } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type { EnterpriseContractPersistencePort } from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';

/**
 * Revision-history helpers for enterprise contracts.
 *
 * Member add/remove used to write `snapshot: {}`, so a revision recorded only
 * that a clinic joined or left — not what it was entitled to at that moment.
 * Reconstructing "was this clinic covered by invoice X" was therefore
 * impossible. These helpers keep the entitlement-bearing terms and the active
 * member set on the revision, which is what billing history actually needs.
 */

/**
 * Active (non-removed) member clinics for a contract, for snapshotting onto a
 * revision.
 *
 * No `take` cap: this is contract administration data, not user input, and a
 * truncated set would write a silently wrong snapshot.
 */
export async function activeMemberClinicIds(
  client: Pick<EnterpriseContractPersistencePort, 'enterpriseContractMember'>,
  contractId: string,
): Promise<string[]> {
  const members = await client.enterpriseContractMember.findMany({
    where: { contractId, removedAt: null },
  });
  return members.map((m) => m.clinicId);
}

export function buildMembershipSnapshot(
  contract: EnterpriseContract,
  memberClinicIds: string[],
  changedClinicId: string,
  change: 'ADDED' | 'REMOVED',
) {
  return toPrismaInputJsonValue({
    change,
    changedClinicId,
    memberClinicIds,
    terms: {
      contractNumber: contract.contractNumber,
      status: contract.status,
      currency: contract.currency,
      billingCycle: contract.billingCycle,
      platformFeeCents: contract.platformFeeCents,
      annualPrepayDiscountPercent: contract.annualPrepayDiscountPercent,
      setupFeeCents: contract.setupFeeCents,
      trueUpThresholdPercent: contract.trueUpThresholdPercent,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      included: {
        users: contract.includedUsers,
        consultations: contract.includedConsultations,
        whatsappMessages: contract.includedWhatsappMessages,
        storageGB: contract.includedStorageGB,
        branches: contract.includedBranches,
        doctors: contract.includedDoctors,
        prescriptions: contract.includedPrescriptions,
        invoices: contract.includedInvoices,
      },
    },
  });
}
