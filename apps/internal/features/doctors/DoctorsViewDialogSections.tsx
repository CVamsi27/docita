// check-non-null-assertion: allow-file — non-null guaranteed by prior guard or Prisma include
"use client";

import { Award, Building2, FileText, GraduationCap, ShieldCheck, ShieldX } from "lucide-react";
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  getDoctorVerificationPublicNote,
} from "@workspace/utils";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { HOSPITAL_ROLE_LABELS, SPECIALIZATION_LABELS } from "@workspace/types";
import { formatInternalListDate } from "@/lib/formatters/format-display-date";
import { type Doctor, getVerificationLabel } from "./doctor-helpers";

export function DoctorInfoGrid({ doctor }: { doctor: Doctor }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Email</Label>
          <p className="font-medium">{doctor.email}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Phone</Label>
          <p className="font-medium">{doctor.phoneNumber || "-"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Specialization</Label>
          <p className="font-medium">
            {doctor.specialization ? SPECIALIZATION_LABELS[doctor.specialization] : "-"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Hospital role</Label>
          <p className="font-medium">
            {doctor.hospitalRole ? HOSPITAL_ROLE_LABELS[doctor.hospitalRole] : "-"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Qualification</Label>
          <p className="font-medium">{doctor.qualification || "-"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Registration Number</Label>
          <p className="font-medium">{doctor.registrationNumber || "-"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">License Number</Label>
          <p className="font-medium">{doctor.licenseNumber || "-"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Verification</Label>
          <p className="font-medium">{getVerificationLabel(doctor.verificationStatus)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Last Verification</Label>
          <p className="font-medium">{formatInternalListDate(doctor.verificationCheckedAt)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Signature Uploaded</Label>
          <p className="font-medium">{formatInternalListDate(doctor.signatureUploadedAt)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Years of Experience</Label>
          <p className="font-medium">
            {doctor.yearsOfExperience ? `${doctor.yearsOfExperience} years` : "-"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Consultation Fee</Label>
          <p className="font-medium">
            {doctor.consultationFee
              ? formatCurrency(doctor.consultationFee, {
                  currency: DEFAULT_CURRENCY,
                  fractionDigits: 0,
                })
              : "-"}
          </p>
        </div>
      </div>

      {doctor.bio && (
        <div>
          <Label className="text-muted-foreground">Biography</Label>
          <p className="mt-1">{doctor.bio}</p>
        </div>
      )}

      {(() => {
        const verificationPublicNote = getDoctorVerificationPublicNote(
          doctor.verificationStatus,
          doctor.verificationReason,
        );
        if (!verificationPublicNote) return null;
        return (
          <div>
            <Label className="text-muted-foreground">Verification note</Label>
            <p className="mt-1">{verificationPublicNote}</p>
          </div>
        );
      })()}
    </>
  );
}

export function DoctorEvidenceSection({ doctor }: { doctor: Doctor }) {
  if (
    !doctor.registrationCouncil &&
    !doctor.registrationStateCode &&
    !doctor.registrationCertificateUrl
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <Label className="text-muted-foreground text-xs uppercase tracking-wide">
        Registration evidence
      </Label>
      {(doctor.registrationCouncil || doctor.registrationStateCode) && (
        <p className="text-sm">
          {doctor.registrationCouncil && (
            <>
              Issuing council:{" "}
              <span className="font-medium">{doctor.registrationCouncil}</span>
            </>
          )}
          {doctor.registrationStateCode && (
            <>
              {doctor.registrationCouncil ? " · " : null}
              Region:{" "}
              <span className="font-medium">{doctor.registrationStateCode}</span>
            </>
          )}
        </p>
      )}
      {doctor.registrationCertificateUrl ? (
        <a
          href={doctor.registrationCertificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <FileText className="h-4 w-4" />
          View uploaded registration certificate
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">
          No registration certificate uploaded.
        </p>
      )}
    </div>
  );
}

interface DoctorVerificationSectionProps {
  doctor: Doctor;
  adminActionBusy: "verify" | "reject" | null;
  rejectionReasonDraft: string;
  showRejectForm: boolean;
  onRejectionReasonChange: (value: string) => void;
  onShowRejectFormChange: (show: boolean) => void;
  onAdminVerify: () => void;
  onAdminReject: () => void;
}

export function DoctorVerificationSection({
  doctor,
  adminActionBusy,
  rejectionReasonDraft,
  showRejectForm,
  onRejectionReasonChange,
  onShowRejectFormChange,
  onAdminVerify,
  onAdminReject,
}: DoctorVerificationSectionProps) {
  if (
    !doctor.registrationNumber ||
    !(
      doctor.verificationStatus === "PENDING" ||
      doctor.verificationStatus === "FAILED" ||
      doctor.verificationStatus === "UNVERIFIED"
    )
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div>
        <Label className="text-sm font-semibold">Admin review</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Confirm this doctor&apos;s registration against the council portal or the
          uploaded certificate, then verify or reject with a reason.
        </p>
      </div>

      {!showRejectForm ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onAdminVerify}
            disabled={adminActionBusy !== null}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {adminActionBusy === "verify" ? "Verifying…" : "Verify Doctor"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onShowRejectFormChange(true)}
            disabled={adminActionBusy !== null}
          >
            <ShieldX className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="reject-reason" className="text-xs text-muted-foreground">
            Rejection reason (visible to the doctor)
          </Label>
          <Textarea
            id="reject-reason"
            value={rejectionReasonDraft}
            onChange={(e) => onRejectionReasonChange(e.target.value)}
            placeholder="e.g. Registration number not found on the Maharashtra Medical Council portal. Please re-check the number and resubmit."
            rows={3}
            maxLength={500}
          />
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onShowRejectFormChange(false);
                onRejectionReasonChange("");
              }}
              disabled={adminActionBusy !== null}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onAdminReject}
              disabled={adminActionBusy !== null}
            >
              {adminActionBusy === "reject" ? "Rejecting…" : "Submit Rejection"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DoctorEducationSection({ doctor }: { doctor: Doctor }) {
  const hasEducation =
    Array.isArray(doctor.educationHistory) && doctor.educationHistory.length > 0;
  const hasCertifications =
    Array.isArray(doctor.certifications) && doctor.certifications.length > 0;

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Education history</h3>
        </div>
        {hasEducation ? (
          <div className="space-y-3">
            {doctor.educationHistory!.map((edu) => (
              <Card key={edu.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{edu.degree}</p>
                      {edu.fieldOfStudy && (
                        <p className="text-sm text-muted-foreground">{edu.fieldOfStudy}</p>
                      )}
                      <p className="text-sm">{edu.institution}</p>
                      {edu.location && (
                        <p className="text-sm text-muted-foreground">{edu.location}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {edu.startYear && `${edu.startYear} - `}
                      {edu.isOngoing ? "Present" : edu.endYear}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No education history added</p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Certifications</h3>
        </div>
        {hasCertifications ? (
          <div className="space-y-3">
            {doctor.certifications!.map((cert) => (
              <Card key={cert.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-sm text-muted-foreground">{cert.issuingBody}</p>
                      {cert.credentialId && (
                        <p className="text-xs text-muted-foreground">ID: {cert.credentialId}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {new Date(cert.issueDate).getFullYear()}
                      </Badge>
                      {cert.expiryDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {formatInternalListDate(cert.expiryDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No certifications added</p>
        )}
      </div>
    </>
  );
}

export function DoctorSpecializationsSection({ doctor }: { doctor: Doctor }) {
  if (
    !Array.isArray(doctor.additionalSpecializations) ||
    doctor.additionalSpecializations.length === 0
  ) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Additional Specializations</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {doctor.additionalSpecializations.map((spec) => (
          <Badge
            key={spec.id}
            variant={spec.isPrimary ? "default" : "outline"}
          >
            {SPECIALIZATION_LABELS[spec.specialization]}
            {spec.yearsOfPractice && ` (${spec.yearsOfPractice}y)`}
          </Badge>
        ))}
      </div>
    </div>
  );
}
