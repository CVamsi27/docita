"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { appQueryKeys } from "@workspace/data-access";
import { useAPIQuery } from "@/lib/api/api-core";
import type { User } from "@workspace/types";
import { RegistrationCertificateUpload } from "@/features/settings/components/doctor-profile/RegistrationCertificateUpload";
import {
  DigitalSignatureCard,
  MedicalRegistrationCard,
} from "./DoctorProfileSettingsSections";

export function DoctorProfileSettings() {
  const { user } = useAuth();

  const { data: doctorProfile } = useAPIQuery<User>(
    appQueryKeys.doctorProfile.detail(user?.id ?? ""),
    `/doctors/${user?.id}`,
    { enabled: !!user?.id },
  );

  const profile = doctorProfile ?? user;
  const hasRegistration = !!profile?.registrationNumber;

  return (
    <div className="flex flex-col gap-6">
      <DigitalSignatureCard signatureUrl={profile?.signatureUrl} />
      <MedicalRegistrationCard profile={profile} />
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
