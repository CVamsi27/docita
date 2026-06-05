"use client";

import { FC } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { LabWorkspaceUI } from "@/features/lab-tests/components/workspace/lab-workspace-ui";

// Payment is verified at the hospital front desk, never by the lab technician.
const PAYMENT_VERIFICATION_ROLES = new Set([
  "ADMIN",
  "ADMIN_DOCTOR",
  "RECEPTIONIST",
]);

export const LabWorkspaceContent: FC = () => {
  const { role } = usePermissions();
  return (
    <LabWorkspaceUI canVerifyPayment={PAYMENT_VERIFICATION_ROLES.has(role)} />
  );
};
