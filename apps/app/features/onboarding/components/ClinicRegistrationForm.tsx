"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

// Schema Definitions
const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Clinic name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address is required"),
  type: z.enum([
    "GENERAL",
    "DENTAL",
    "PEDIATRIC",
    "ORTHOPEDIC",
    "CARDIOLOGY",
    "DERMATOLOGY",
    "ENT",
    "GYNECOLOGY",
    "OPHTHALMOLOGY",
    "PSYCHIATRY",
    "SPECIALTY",
  ]),
  website: z.string().url().optional().or(z.literal("")),
});

const adminAccountSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  phoneNumber: z.string().min(10, "Phone number is required"),
});

const complianceSchema = z.object({
  acceptedSLA: z
    .boolean()
    .refine((val) => val === true, "You must accept the SLA"),
  acceptedPrivacyPolicy: z
    .boolean()
    .refine((val) => val === true, "You must accept the Privacy Policy"),
  acceptedDataProcessing: z
    .boolean()
    .refine(
      (val) => val === true,
      "You must accept the Data Processing Agreement"
    ),
  enableWhatsApp: z.boolean(),
  requireConsent: z.boolean(),
});

// Combined Schema for the whole flow (if needed) but we handle steps separately
type ClinicDetails = z.infer<typeof clinicDetailsSchema>;
type AdminAccount = z.infer<typeof adminAccountSchema>;
type ComplianceSettings = z.infer<typeof complianceSchema>;

const defaultComplianceValues: ComplianceSettings = {
  acceptedSLA: false,
  acceptedPrivacyPolicy: false,
  acceptedDataProcessing: false,
  enableWhatsApp: false,
  requireConsent: true,
};

export function ClinicRegistrationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);

  // State to hold form data across steps
  const [formData, setFormData] = useState({
    clinicDetails: {} as Partial<ClinicDetails>,
    adminAccount: {} as Partial<AdminAccount>,
    compliance: {} as Partial<ComplianceSettings>,
  });

  // Step 1 Form
  const clinicForm = useForm<ClinicDetails>({
    resolver: zodResolver(clinicDetailsSchema),
    defaultValues: formData.clinicDetails as ClinicDetails,
  });

  // Step 2 Form
  const adminForm = useForm<AdminAccount>({
    resolver: zodResolver(adminAccountSchema),
    defaultValues: formData.adminAccount as AdminAccount,
  });

  // Step 3 Form
  const complianceForm = useForm<ComplianceSettings>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      ...defaultComplianceValues,
      ...formData.compliance,
    },
  });

  const submitRegistration = async (complianceData: ComplianceSettings) => {
    // Ensure incomplete parts are not used if logic were different, but here we assume validation passed.
    const details = formData.clinicDetails as ClinicDetails;
    const admin = formData.adminAccount as AdminAccount;

    if (!details.name || !admin.email) {
      toast.error("Missing previous step data. Please go back.");
      return;
    }

    try {
      // Prepare payload to match OnboardingService expectations
      const payload = {
        clinicDetails: details,
        adminAccount: admin,
        planSelection: {
          tier: "CAPTURE", // Default to free tier for now
          billingCycle: "MONTHLY",
        },
        slaAgreement: {
          acceptedSLA: complianceData.acceptedSLA,
          acceptedPrivacyPolicy: complianceData.acceptedPrivacyPolicy,
          acceptedDataProcessingTerms: complianceData.acceptedDataProcessing,
          slaVersion: "1.0",
          acceptedBy: admin.name,
          ipAddress: "client-ip", // Server will override
          userAgent: navigator.userAgent,
        },
        consentManagement: {
          enableWhatsAppCommunication: complianceData.enableWhatsApp,
          enableMarketingCommunications: false,
          patientConsentRequiredBeforeWhatsApp: complianceData.requireConsent,
          logAllConsentChanges: true,
          dataProcessingPurposes: ["TREATMENT", "BILLING"],
        },
        paymentDetails: {}, // Optional for free tier
      };

      const initRes = await fetch("/api/onboarding/initialize", {
        method: "POST",
      });
      const { onboardingId } = await initRes.json();

      const res = await fetch(`/api/onboarding/${onboardingId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }

      toast.success("Registration Successful", {
        description: "Your clinic has been registered. Redirecting...",
      });

      onSuccess();
    } catch (error) {
      toast.error("Registration Failed", {
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Clinic Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="step1"
              onSubmit={clinicForm.handleSubmit((data) => {
                setFormData((prev) => ({ ...prev, clinicDetails: data }));
                setStep(2);
              })}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Clinic Name</Label>
                <Input
                  id="name"
                  {...clinicForm.register("name")}
                  placeholder="HealthPlus Clinic"
                />
                {clinicForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {clinicForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Clinic Type</Label>
                <Select
                  onValueChange={(val) =>
                    clinicForm.setValue("type", val as any)
                  }
                  defaultValue={clinicForm.getValues("type")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General Practice</SelectItem>
                    <SelectItem value="DENTAL">Dental</SelectItem>
                    <SelectItem value="PEDIATRIC">Pediatric</SelectItem>
                    <SelectItem value="ORTHOPEDIC">Orthopedic</SelectItem>
                    <SelectItem value="CARDIOLOGY">Cardiology</SelectItem>
                    <SelectItem value="DERMATOLOGY">Dermatology</SelectItem>
                    <SelectItem value="ENT">ENT</SelectItem>
                    <SelectItem value="GYNECOLOGY">Gynecology</SelectItem>
                    <SelectItem value="OPHTHALMOLOGY">Ophthalmology</SelectItem>
                    <SelectItem value="PSYCHIATRY">Psychiatry</SelectItem>
                    <SelectItem value="SPECIALTY">Specialty</SelectItem>
                  </SelectContent>
                </Select>
                {clinicForm.formState.errors.type && (
                  <p className="text-sm text-red-500">
                    {clinicForm.formState.errors.type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Clinic Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...clinicForm.register("email")}
                  placeholder="contact@clinic.com"
                />
                {clinicForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {clinicForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...clinicForm.register("phone")}
                  placeholder="+91 9876543210"
                />
                {clinicForm.formState.errors.phone && (
                  <p className="text-sm text-red-500">
                    {clinicForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...clinicForm.register("address")}
                  placeholder="123 Medical Lane, City"
                />
                {clinicForm.formState.errors.address && (
                  <p className="text-sm text-red-500">
                    {clinicForm.formState.errors.address.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  {...clinicForm.register("website")}
                  placeholder="https://clinic.com"
                />
                {clinicForm.formState.errors.website && (
                  <p className="text-sm text-red-500">
                    {clinicForm.formState.errors.website.message}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button className="w-full" form="step1" type="submit">
              Next: Admin Account
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Account Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="step2"
              onSubmit={adminForm.handleSubmit((data) => {
                setFormData((prev) => ({ ...prev, adminAccount: data }));
                setStep(3);
              })}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="adminName">Full Name</Label>
                <Input
                  id="adminName"
                  {...adminForm.register("name")}
                  placeholder="Dr. John Doe"
                />
                {adminForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {adminForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  {...adminForm.register("email")}
                  placeholder="john@clinic.com"
                />
                {adminForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {adminForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...adminForm.register("password")}
                />
                {adminForm.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {adminForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPhone">Mobile Number</Label>
                <Input
                  id="adminPhone"
                  {...adminForm.register("phoneNumber")}
                  placeholder="+91 9876543210"
                />
                {adminForm.formState.errors.phoneNumber && (
                  <p className="text-sm text-red-500">
                    {adminForm.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-1" form="step2" type="submit">
              Next: Compliance & Legal
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance & Legal</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="step3"
              onSubmit={complianceForm.handleSubmit(submitRegistration)}
              className="space-y-6"
            >
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-semibold">DPDP Compliance Settings</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireConsent"
                    checked={complianceForm.watch("requireConsent")}
                    onCheckedChange={(checked) =>
                      complianceForm.setValue(
                        "requireConsent",
                        checked as boolean
                      )
                    }
                  />
                  <Label htmlFor="requireConsent">
                    Require explicit patient consent for WhatsApp communications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableWhatsApp"
                    checked={complianceForm.watch("enableWhatsApp")}
                    onCheckedChange={(checked) =>
                      complianceForm.setValue(
                        "enableWhatsApp",
                        checked as boolean
                      )
                    }
                  />
                  <Label htmlFor="enableWhatsApp">
                    Enable WhatsApp integration (requires Business API approval)
                  </Label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Legal Agreements</h3>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="sla"
                    className="mt-1"
                    checked={complianceForm.watch("acceptedSLA")}
                    onCheckedChange={(checked) =>
                      complianceForm.setValue("acceptedSLA", checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="sla" className="text-sm font-normal">
                      I accept the{" "}
                      <a href="#" className="underline text-primary">
                        Service Level Agreement (SLA)
                      </a>
                    </Label>
                    {complianceForm.formState.errors.acceptedSLA && (
                      <p className="text-sm text-red-500">
                        {complianceForm.formState.errors.acceptedSLA.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    className="mt-1"
                    checked={complianceForm.watch("acceptedPrivacyPolicy")}
                    onCheckedChange={(checked) =>
                      complianceForm.setValue(
                        "acceptedPrivacyPolicy",
                        checked as boolean
                      )
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="privacy" className="text-sm font-normal">
                      I accept the{" "}
                      <a href="#" className="underline text-primary">
                        Privacy Policy
                      </a>
                    </Label>
                    {complianceForm.formState.errors.acceptedPrivacyPolicy && (
                      <p className="text-sm text-red-500">
                        {
                          complianceForm.formState.errors.acceptedPrivacyPolicy
                            .message
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="dpa"
                    className="mt-1"
                    checked={complianceForm.watch("acceptedDataProcessing")}
                    onCheckedChange={(checked) =>
                      complianceForm.setValue(
                        "acceptedDataProcessing",
                        checked as boolean
                      )
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="dpa" className="text-sm font-normal">
                      I accept the{" "}
                      <a href="#" className="underline text-primary">
                        Data Processing Agreement (DPDP Compliant)
                      </a>
                    </Label>
                    {complianceForm.formState.errors.acceptedDataProcessing && (
                      <p className="text-sm text-red-500">
                        {
                          complianceForm.formState.errors.acceptedDataProcessing
                            .message
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              className="flex-1"
              form="step3"
              type="submit"
              disabled={complianceForm.formState.isSubmitting}
            >
              {complianceForm.formState.isSubmitting
                ? "Creating Clinic..."
                : "Complete Registration"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
