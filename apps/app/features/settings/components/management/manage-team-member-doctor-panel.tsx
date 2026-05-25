"use client";

import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { ShieldCheck, ShieldX } from "lucide-react";
import { User } from "@workspace/types";
import { getDoctorVerificationPublicNote } from "@/lib/formatters/doctor-verification-display";
import type { MemberFormValues } from "@/features/settings/components/management/member-management-schemas";

export function ManageTeamMemberDoctorPanel({
  member,
  memberForm,
  isManaging,
  isReverifyingDoctor,
  onReverifyDoctor,
  getVerificationBadgeVariant,
  getVerificationBadgeLabel,
  formatDate,
}: {
  member: User;
  memberForm: UseFormReturn<MemberFormValues>;
  isManaging: boolean;
  isReverifyingDoctor: boolean;
  onReverifyDoctor: (doctorId: string) => void;
  getVerificationBadgeVariant: (
    status?: User["verificationStatus"],
  ) => "default" | "secondary" | "destructive" | "outline";
  getVerificationBadgeLabel: (status?: User["verificationStatus"]) => string;
  formatDate: (value?: string | Date) => string;
}) {
  const verificationPublicNote = getDoctorVerificationPublicNote(
    member.verificationStatus,
    member.verificationReason,
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          control={memberForm.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialization</FormLabel>
              <FormControl>
                <Input placeholder="Cardiology" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={memberForm.control}
          name="qualification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qualification</FormLabel>
              <FormControl>
                <Input placeholder="Qualification" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={memberForm.control}
          name="registrationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration #</FormLabel>
              <FormControl>
                <Input placeholder="Registration number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="rounded-lg border bg-surface-2 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={getVerificationBadgeVariant(member.verificationStatus)}
            >
              {member.verificationStatus === "VERIFIED" ? (
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              ) : (
                <ShieldX className="mr-1 h-3.5 w-3.5" />
              )}
              {getVerificationBadgeLabel(member.verificationStatus)}
            </Badge>
            <Badge
              variant={member.signatureUploadedAt ? "default" : "outline"}
            >
              Signature {member.signatureUploadedAt ? "Ready" : "Missing"}
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Last verification: {formatDate(member.verificationCheckedAt)}</p>
            <p>Signature uploaded: {formatDate(member.signatureUploadedAt)}</p>
            {verificationPublicNote ? (
              <p>Status details: {verificationPublicNote}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {!member.signatureUploadedAt ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/verify-doctor">Complete Doctor Verification</Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onReverifyDoctor(member.id)}
              disabled={isManaging}
            >
              {isReverifyingDoctor ? (
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  className="mr-2"
                />
              ) : null}
              Reverify Registration
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
