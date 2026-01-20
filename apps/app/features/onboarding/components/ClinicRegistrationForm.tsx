"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
import {
  CLINIC_TYPE_LABELS,
  type ClinicType,
  clinicTypeSchema,
} from "@workspace/types";
import { ConsentNoticeModal } from "../../legal/components/ConsentNoticeModal";
import { PlanSelectionStep } from "./steps/PlanSelectionStep";
import { TeamInviteStep } from "./steps/TeamInviteStep";
import { PaymentStep } from "./steps/PaymentStep";

// Schema Definitions
const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Clinic name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address is required"),
  type: clinicTypeSchema,
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
      "You must accept the Data Processing Agreement",
    ),
  enableWhatsApp: z.boolean(),
  requireConsent: z.boolean(),
});

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

interface PaymentDetails {
  cardNumber: string;
  autoPay: boolean;
  addons: {
    whatsapp: boolean;
    intelligence: boolean;
  };
}

interface TeamMember {
  email: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN_DOCTOR";
  name?: string;
}

export function ClinicRegistrationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // State to hold form data across steps
  const [formData, setFormData] = useState({
    clinicDetails: {} as Partial<ClinicDetails>,
    adminAccount: {} as Partial<AdminAccount>,
    compliance: {} as Partial<ComplianceSettings>,
    planSelection: {
      tier: "CAPTURE",
      billingCycle: "MONTHLY" as "MONTHLY" | "YEARLY",
      price: 0,
      currency: "₹",
    },
    paymentDetails: {} as Partial<PaymentDetails>,
    teamMembers: [] as TeamMember[],
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

  // Step 6 Form (Compliance)
  const complianceForm = useForm<ComplianceSettings>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      ...defaultComplianceValues,
      ...formData.compliance,
    },
  });

  const submitRegistration = async (complianceData: ComplianceSettings) => {
    const details = formData.clinicDetails as ClinicDetails;
    const admin = formData.adminAccount as AdminAccount;

    if (!details.name || !admin.email) {
      toast.error("Missing previous step data. Please go back.");
      return;
    }

    try {
      const payload = {
        clinicDetails: details,
        adminAccount: admin,
        planSelection: {
          tier: formData.planSelection.tier,
          billingCycle: formData.planSelection.billingCycle,
        },
        slaAgreement: {
          acceptedSLA: complianceData.acceptedSLA,
          acceptedPrivacyPolicy: complianceData.acceptedPrivacyPolicy,
          acceptedDataProcessingTerms: complianceData.acceptedDataProcessing,
          slaVersion: "1.0",
          acceptedBy: admin.name,
          ipAddress: "client-ip",
          userAgent: navigator.userAgent,
        },
        consentManagement: {
          enableWhatsAppCommunication:
            formData.paymentDetails?.addons?.whatsapp ||
            complianceData.enableWhatsApp,
          enableMarketingCommunications: false,
          patientConsentRequiredBeforeWhatsApp: complianceData.requireConsent,
          logAllConsentChanges: true,
          dataProcessingPurposes: ["TREATMENT", "BILLING"],
        },
        paymentDetails: formData.paymentDetails,
        teamMembers: formData.teamMembers,
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

      const responseData = await res.json();

      if (responseData.access_token && responseData.user) {
        localStorage.setItem("docita_token", responseData.access_token);
        localStorage.setItem("docita_user", JSON.stringify(responseData.user));
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
      {/* Step Indicator can be added here */}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Clinic Details</CardTitle>
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
                    clinicForm.setValue("type", val as ClinicType)
                  }
                  defaultValue={clinicForm.getValues("type")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CLINIC_TYPE_LABELS) as ClinicType[]).map(
                      (type) => (
                        <SelectItem key={type} value={type}>
                          {CLINIC_TYPE_LABELS[type]}
                        </SelectItem>
                      ),
                    )}
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
                <PhoneInput
                  id="phone"
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  value={clinicForm.watch("phone")}
                  onChange={(value) =>
                    clinicForm.setValue("phone", value || "")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background [&>input]:outline-none [&>input]:bg-transparent"
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
            <CardTitle>Step 2: Admin Account Setup</CardTitle>
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
                <PhoneInput
                  id="adminPhone"
                  defaultCountry="IN"
                  international
                  value={adminForm.watch("phoneNumber")}
                  onChange={(value) =>
                    adminForm.setValue("phoneNumber", value || "")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background [&>input]:outline-none [&>input]:bg-transparent"
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
              Next: Select Plan
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <PlanSelectionStep
          currency="₹"
          defaultTier={formData.planSelection.tier}
          defaultBillingCycle={formData.planSelection.billingCycle}
          onSelect={(tier, billingCycle, pricing) => {
            const price =
              billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;
            setFormData((prev) => ({
              ...prev,
              planSelection: {
                tier,
                billingCycle,
                price: typeof price === "number" ? price : 0,
                currency: "₹",
              },
            }));

            // If free tier, skip payment
            if (tier === "CAPTURE") {
              setStep(5); // Skip Payment
            } else {
              setStep(4);
            }
          }}
        />
      )}

      {step === 4 && (
        <PaymentStep
          selectedPlanPrice={formData.planSelection.price}
          billingCycle={formData.planSelection.billingCycle}
          currencySymbol={formData.planSelection.currency}
          onBack={() => setStep(3)}
          onComplete={(paymentDetails) => {
            setFormData((prev) => ({ ...prev, paymentDetails }));
            setStep(5);
          }}
        />
      )}

      {step === 5 && (
        <TeamInviteStep
          onSkip={() => setStep(6)}
          onComplete={(members) => {
            setFormData((prev) => ({ ...prev, teamMembers: members }));
            setStep(6);
          }}
        />
      )}

      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6: Compliance & Legal</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="step6"
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
                        checked as boolean,
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
                    checked={
                      complianceForm.watch("enableWhatsApp") ||
                      formData.paymentDetails?.addons?.whatsapp
                    }
                    disabled={formData.paymentDetails?.addons?.whatsapp}
                    onCheckedChange={(checked) =>
                      complianceForm.setValue(
                        "enableWhatsApp",
                        checked as boolean,
                      )
                    }
                  />
                  <Label htmlFor="enableWhatsApp">
                    Enable WhatsApp integration
                    {formData.paymentDetails?.addons?.whatsapp &&
                      " (Included in Add-on)"}
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
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setShowConsentModal(true);
                      } else {
                        complianceForm.setValue("acceptedPrivacyPolicy", false);
                      }
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="privacy" className="text-sm font-normal">
                      I accept the{" "}
                      <a href="#" className="underline text-primary">
                        Privacy Policy & Data Consent
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
                        checked as boolean,
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
            <Button
              variant="outline"
              onClick={() =>
                setStep(formData.planSelection.tier === "CAPTURE" ? 3 : 5)
              }
            >
              Back
            </Button>
            <Button
              className="flex-1"
              form="step6"
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

      {/* DPDP Consent Modal */}
      <ConsentNoticeModal
        open={showConsentModal}
        onOpenChange={(open) => {
          setShowConsentModal(open);
          if (!open && !complianceForm.getValues("acceptedPrivacyPolicy")) {
            // If closed without acceptance
          }
        }}
        userType="clinic"
        onConsent={(_) => {
          complianceForm.setValue("acceptedPrivacyPolicy", true);
          setShowConsentModal(false);
        }}
        onDecline={() => {
          complianceForm.setValue("acceptedPrivacyPolicy", false);
          setShowConsentModal(false);
        }}
      />
    </div>
  );
}
