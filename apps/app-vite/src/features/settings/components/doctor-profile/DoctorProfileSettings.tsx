import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { appQueryKeys } from "@workspace/data-access";
import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";
import type { User } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { RegistrationCertificateUpload } from "@/features/settings/components/doctor-profile/RegistrationCertificateUpload";
import { DigitalSignatureCard, HprIdCard, MedicalRegistrationCard } from "./DoctorProfileSettingsSections";

export function DoctorProfileSettings() {
  const { user } = useAuth();
  const [hprIdDraft, setHprIdDraft] = useState<string | null>(null);

  const { data: doctorProfile } = useAPIQuery<User>(
    appQueryKeys.doctorProfile.detail(user?.id ?? ""),
    `/doctors/${user?.id}`,
    { enabled: !!user?.id },
  );

  const profile = doctorProfile ?? user;
  const hasRegistration = !!profile?.registrationNumber;
  const updateDoctorMutation = useAPIMutation<User, { hprId: string }>(
    `/doctors/${profile?.id ?? ""}`,
    "PUT",
    {
      invalidateKeys: profile?.id
        ? [appQueryKeys.doctorProfile.detail(profile.id)]
        : [],
      onSuccess: () => {
        toast.success("HPR ID updated");
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not save the HPR ID. Please try again.",
          "form",
        );
      },
    },
  );

  const resolvedHprIdDraft = hprIdDraft ?? profile?.hprId ?? "";

  return (
    <div className="flex flex-col gap-6">
      <DigitalSignatureCard signatureUrl={profile?.signatureUrl} />
      <MedicalRegistrationCard profile={profile} />
      <HprIdCard
        value={resolvedHprIdDraft}
        savedValue={profile?.hprId ?? ""}
        isPending={updateDoctorMutation.isPending}
        onChange={setHprIdDraft}
        onSave={() => {
          updateDoctorMutation.mutate({ hprId: resolvedHprIdDraft.trim() });
        }}
      />
      {hasRegistration && profile?.id && (
        <RegistrationCertificateUpload
          doctorId={profile.id}
          certificateUrl={profile.registrationCertificateUrl}
          verificationStatus={profile.verificationStatus}
        />
      )}
    </div>
  );
}
