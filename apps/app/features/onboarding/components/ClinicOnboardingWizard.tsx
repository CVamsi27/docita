"use client";

import { ClinicRegistrationForm } from "./ClinicRegistrationForm";
import { useRouter } from "next/navigation";

export function ClinicOnboardingWizard() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Docita</h1>
        <p className="text-muted-foreground">
          Complete your clinic registration to get started.
        </p>
      </div>

      <ClinicRegistrationForm onSuccess={() => router.push("/dashboard")} />
    </div>
  );
}
