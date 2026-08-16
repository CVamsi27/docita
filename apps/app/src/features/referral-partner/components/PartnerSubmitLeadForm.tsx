import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSubmitFacilityLead } from "@workspace/data-access";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { FormSelectField } from "@workspace/ui/components/form/form-select-field";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { getUserFacingErrorMessage } from "@workspace/utils";
import {
  facilityLeadSubmitSchema,
  type FacilityLeadType,
  type FacilityLeadView,
} from "@workspace/types";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { LeadTextField, type LeadFormValues } from "./LeadFormFields";

const FACILITY_TYPE_OPTIONS: Array<{ value: FacilityLeadType; labelKey: string }> =
  [
    { value: "CLINIC", labelKey: "submitLead.typeClinic" },
    { value: "HOSPITAL", labelKey: "submitLead.typeHospital" },
    { value: "DIAGNOSTIC_CENTRE", labelKey: "submitLead.typeDiagnosticCentre" },
    { value: "PHARMACY", labelKey: "submitLead.typePharmacy" },
    { value: "NURSING_HOME", labelKey: "submitLead.typeNursingHome" },
    { value: "OTHER", labelKey: "submitLead.typeOther" },
  ];

const CHANNEL_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: "WHATSAPP", labelKey: "submitLead.channelWhatsapp" },
  { value: "SMS", labelKey: "submitLead.channelSms" },
  { value: "PHONE", labelKey: "submitLead.channelPhone" },
  { value: "EMAIL", labelKey: "submitLead.channelEmail" },
  { value: "NONE", labelKey: "submitLead.channelNone" },
];

/**
 * Client-generated idempotency key (the API's contract: resubmits with the
 * same key return the existing lead). A fresh key is minted per form
 * session and only rotated after a successful submit, so retrying after a
 * network failure returns the already-created lead instead of a duplicate.
 */
function newIdempotencyKey(): string {
  const cryptoImpl = globalThis.crypto;
  if (cryptoImpl && typeof cryptoImpl.randomUUID === "function") {
    return cryptoImpl.randomUUID();
  }
  return `lead-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function readApiErrorFields(error: unknown): {
  status?: number;
  code?: string;
} {
  if (!error || typeof error !== "object") return {};
  const record = error as { status?: unknown; code?: unknown };
  return {
    status: typeof record.status === "number" ? record.status : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
}

/**
 * Facility-lead submission form for the partner portal. Posts to
 * POST /partner/me/leads via the data-access mutation and surfaces the
 * contract's distinct outcomes: normal submission, DUPLICATE_REVIEW
 * (same-facility submission held for operator review), the 409
 * DUPLICATE_ENTRY conflict, and an expired/deactivated session (401 →
 * sign out and return to the login page).
 */
export function PartnerSubmitLeadForm() {
  const { t } = useTranslation("ReferralPartner");
  const navigate = useNavigate();
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const submit = useSubmitFacilityLead(ctx.accessToken, ctx.baseUrl);

  const [result, setResult] = useState<FacilityLeadView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(facilityLeadSubmitSchema),
    defaultValues: {
      facilityName: "",
      address: "",
      city: "",
      contactName: "",
      consentToFollowUp: false,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null);
    if (values.consentToFollowUp !== true) {
      form.setError("consentToFollowUp", {
        message: t("submitLead.consentRequired"),
      });
      return;
    }
    try {
      const view = await submit.mutateAsync({
        ...values,
        // The key is minted once per form session so a retry after a
        // network failure reuses it (idempotent resubmit).
        idempotencyKey: idempotencyKeyRef.current,
      });
      idempotencyKeyRef.current = newIdempotencyKey();
      form.reset({
        facilityName: "",
        address: "",
        city: "",
        contactName: "",
        consentToFollowUp: false,
      });
      setResult(view);
    } catch (err) {
      const { status, code } = readApiErrorFields(err);
      if (code === "DUPLICATE_ENTRY") {
        setError(t("submitLead.errorDuplicate"));
        return;
      }
      if (status === 401) {
        // Deactivated partner or expired session — the portal session is
        // no longer valid, so return to the login screen.
        auth.signOut();
        navigate("/partner/login", { replace: true });
        return;
      }
      setError(
        getUserFacingErrorMessage(err, {
          fallback: t("submitLead.errorSubmitFallback"),
        }),
      );
    }
  });

  if (result) {
    const isDuplicateReview = result.status === "DUPLICATE_REVIEW";
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {t(
              isDuplicateReview
                ? "submitLead.duplicateReviewTitle"
                : "submitLead.successTitle",
            )}
          </CardTitle>
          <CardDescription>
            {isDuplicateReview
              ? t("submitLead.duplicateReviewDescription")
              : t("submitLead.successDescription", {
                  facility: result.facilityName,
                })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setResult(null)}>
            {t("submitLead.submitAnother")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const textField = (
    name: keyof LeadFormValues,
    label: string,
    placeholder?: string,
    extra?: { type?: string; emptyToUndefined?: boolean; className?: string },
  ) => (
    <LeadTextField
      control={form.control}
      name={name}
      label={t(label)}
      placeholder={placeholder ? t(placeholder) : undefined}
      type={extra?.type}
      emptyToUndefined={extra?.emptyToUndefined}
      className={extra?.className}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("submitLead.title")}</CardTitle>
        <CardDescription>{t("submitLead.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              {textField(
                "facilityName",
                "submitLead.facilityName",
                "submitLead.facilityNamePlaceholder",
              )}
              <FormSelectField
                control={form.control}
                name="facilityType"
                label={t("submitLead.facilityType")}
                placeholder={t("submitLead.facilityTypePlaceholder")}
                options={FACILITY_TYPE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.labelKey),
                }))}
              />
              {textField(
                "address",
                "submitLead.address",
                "submitLead.addressPlaceholder",
                { className: "sm:col-span-2" },
              )}
              {textField("city", "submitLead.city", "submitLead.cityPlaceholder")}
              {textField("state", "submitLead.state")}
              {textField(
                "contactName",
                "submitLead.contactName",
                "submitLead.contactNamePlaceholder",
              )}
              {textField("contactRole", "submitLead.contactRole")}
              {textField("contactPhone", "submitLead.contactPhone")}
              {textField("contactEmail", "submitLead.contactEmail", undefined, {
                type: "email",
                emptyToUndefined: true,
              })}
              {textField("postalCode", "submitLead.postalCode")}
              {textField("mapsUrl", "submitLead.mapsUrl", undefined, {
                emptyToUndefined: true,
              })}
              <FormSelectField
                control={form.control}
                name="preferredChannel"
                label={t("submitLead.preferredChannel")}
                options={CHANNEL_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.labelKey),
                }))}
              />
              {textField("bestTimeToContact", "submitLead.bestTimeToContact")}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormControl>
                      <Textarea
                        rows={3}
                        aria-label={t("submitLead.notes")}
                        placeholder={t("submitLead.notes")}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consentToFollowUp"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormControl>
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                        <span>{t("submitLead.consentLabel")}</span>
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{t("submitLead.errorTitle")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending
                ? t("submitLead.submitting")
                : t("submitLead.submit")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
