"use client";

import { Stethoscope } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { type Doctor } from "./doctor-helpers";
import {
  DoctorEducationSection,
  DoctorEvidenceSection,
  DoctorInfoGrid,
  DoctorSpecializationsSection,
  DoctorVerificationSection,
} from "./DoctorsViewDialogSections";

interface DoctorsViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Doctor | null;
  adminActionBusy: "verify" | "reject" | null;
  rejectionReasonDraft: string;
  showRejectForm: boolean;
  onRejectionReasonChange: (value: string) => void;
  onShowRejectFormChange: (show: boolean) => void;
  onAdminVerify: () => void;
  onAdminReject: () => void;
}

export function DoctorsViewDialog({
  open,
  onOpenChange,
  doctor,
  adminActionBusy,
  rejectionReasonDraft,
  showRejectForm,
  onRejectionReasonChange,
  onShowRejectFormChange,
  onAdminVerify,
  onAdminReject,
}: DoctorsViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Dr. {doctor?.name}
          </DialogTitle>
          <DialogDescription>
            Complete doctor profile and credentials
          </DialogDescription>
        </DialogHeader>

        {doctor && (
          <div className="space-y-6">
            <DoctorInfoGrid doctor={doctor} />
            <DoctorEvidenceSection doctor={doctor} />
            <DoctorVerificationSection
              doctor={doctor}
              adminActionBusy={adminActionBusy}
              rejectionReasonDraft={rejectionReasonDraft}
              showRejectForm={showRejectForm}
              onRejectionReasonChange={onRejectionReasonChange}
              onShowRejectFormChange={onShowRejectFormChange}
              onAdminVerify={onAdminVerify}
              onAdminReject={onAdminReject}
            />
            <DoctorEducationSection doctor={doctor} />
            <DoctorSpecializationsSection doctor={doctor} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
