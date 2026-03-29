"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  billingAPI,
  type PricingOfferRow,
  type TierPricingRow,
} from "@/lib/api";
import { fetchClinics } from "@/features/users/api";
import type { Clinic } from "@/features/users/types";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

interface EditableTierRow extends TierPricingRow {
  isDirty?: boolean;
}

interface PricingOfferFormState {
  clinicId: string;
  title: string;
  description: string;
  percentOff: number;
  durationMonths: number;
  validUntil: string;
  notes: string;
}

interface OfferTemplate {
  key: string;
  label: string;
  title: string;
  description: string;
  percentOff: number;
  durationMonths: number;
  notes: string;
}

const DEFAULT_OFFER_FORM: PricingOfferFormState = {
  clinicId: "",
  title: "",
  description: "",
  percentOff: 100,
  durationMonths: 3,
  validUntil: "",
  notes: "",
};

const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    key: "three_months_free",
    label: "3 months free",
    title: "3 months free with weekly feedback",
    description:
      "Offer 100% discount for the first three months in exchange for weekly feedback and onboarding calls.",
    percentOff: 100,
    durationMonths: 3,
    notes: "Founders asked for hands-on onboarding. Keep the weekly feedback cadence.",
  },
  {
    key: "half_year_discount",
    label: "50% for 6 months",
    title: "Half-price launch offer",
    description:
      "Reduce the first six months by 50% to close a skeptical clinic quickly.",
    percentOff: 50,
    durationMonths: 6,
    notes: "Good for tier 2/3 city clinics that need a softer entry point.",
  },
  {
    key: "annual_soft_launch",
    label: "25% annual",
    title: "Annual soft-launch discount",
    description:
      "Use this for annual commitment deals where payment is collected upfront.",
    percentOff: 25,
    durationMonths: 12,
    notes: "Best when the clinic is ready to commit and needs an intro discount.",
  },
];

export default function PricingPage() {
  const { token } = useAuth();
  const [tiers, setTiers] = useState<EditableTierRow[]>([]);
  const [offers, setOffers] = useState<PricingOfferRow[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoadingTiers, setIsLoadingTiers] = useState(true);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [offerForm, setOfferForm] = useState<PricingOfferFormState>(
    DEFAULT_OFFER_FORM,
  );

  const loadTiers = useCallback(async () => {
    setIsLoadingTiers(true);
    try {
      const data = await billingAPI.getPricingTiers();
      setTiers(data);
    } finally {
      setIsLoadingTiers(false);
    }
  }, []);

  const loadOffers = useCallback(async () => {
    setIsLoadingOffers(true);
    try {
      const data = await billingAPI.getPricingOffers();
      setOffers(data);
    } finally {
      setIsLoadingOffers(false);
    }
  }, []);

  const loadClinics = useCallback(async () => {
    if (!token) {
      setClinics([]);
      setIsLoadingClinics(false);
      return;
    }

    setIsLoadingClinics(true);
    try {
      const data = await fetchClinics(token);
      setClinics(data);
    } catch {
      setClinics([]);
    } finally {
      setIsLoadingClinics(false);
    }
  }, [token]);

  useEffect(() => {
    loadTiers();
    loadOffers();
    loadClinics();
  }, [loadTiers, loadOffers, loadClinics]);

  const clinicOptions = useMemo(() => {
    return clinics.map((clinic) => ({
      id: clinic.id,
      name: clinic.name,
    }));
  }, [clinics]);

  const handleTierFieldChange = (
    tierId: string,
    field: keyof TierPricingRow,
    value: number | string,
  ) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId ? { ...tier, [field]: value, isDirty: true } : tier,
      ),
    );
  };

  const saveTier = async (tier: EditableTierRow) => {
    setSavingId(tier.id);
    setSaveError(null);
    try {
      await billingAPI.updatePricingTier(tier.id, {
        monthlyBasePriceCents: tier.monthlyBasePriceCents,
        includedPatients: tier.includedPatients,
        includedAppointments: tier.includedAppointments,
        includedStorageGB: tier.includedStorageGB,
        includedUsers: tier.includedUsers,
        overagePatientCents: tier.overagePatientCents,
        overageAppointmentCents: tier.overageAppointmentCents,
        overageStorageCents: tier.overageStorageCents,
        overageUserCents: tier.overageUserCents,
        overagePrescriptionCents: tier.overagePrescriptionCents,
        overageInvoiceCents: tier.overageInvoiceCents,
        overageOcrPageCents: tier.overageOcrPageCents,
        overageApiCallCents: tier.overageApiCallCents,
      });
      setTiers((prev) =>
        prev.map((item) =>
          item.id === tier.id ? { ...item, isDirty: false } : item,
        ),
      );
    } catch {
      setSaveError(`Failed to save ${tier.name}`);
    } finally {
      setSavingId(null);
    }
  };

  const saveOffer = async () => {
    if (!offerForm.clinicId || !offerForm.title.trim()) {
      setSaveError("Pick a clinic and enter an offer title first.");
      return;
    }

    setSavingId(offerForm.clinicId);
    setSaveError(null);
    try {
      const updated = await billingAPI.upsertPricingOffer(offerForm.clinicId, {
        title: offerForm.title.trim(),
        description: offerForm.description.trim(),
        percentOff: offerForm.percentOff,
        durationMonths: offerForm.durationMonths || undefined,
        validUntil: offerForm.validUntil || undefined,
        notes: offerForm.notes.trim() || undefined,
      });

      setOffers((prev) => {
        const next = prev.filter((offer) => offer.clinicId !== updated.clinicId);
        return [updated, ...next];
      });
      setOfferForm(DEFAULT_OFFER_FORM);
    } catch {
      setSaveError("Failed to save the clinic offer.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteOffer = async (clinicId: string) => {
    setSavingId(clinicId);
    setSaveError(null);
    try {
      await billingAPI.deletePricingOffer(clinicId);
      setOffers((prev) => prev.filter((offer) => offer.clinicId !== clinicId));
      if (offerForm.clinicId === clinicId) {
        setOfferForm(DEFAULT_OFFER_FORM);
      }
    } catch {
      setSaveError("Failed to delete the clinic offer.");
    } finally {
      setSavingId(null);
    }
  };

  const applyTemplate = (template: OfferTemplate) => {
    setOfferForm((prev) => ({
      ...prev,
      title: template.title,
      description: template.description,
      percentOff: template.percentOff,
      durationMonths: template.durationMonths,
      notes: template.notes,
    }));
  };

  const numericField = (
    tierId: string,
    field: keyof TierPricingRow,
    value: number,
  ) => (
    <Input
      type="number"
      className="w-24 h-7 text-xs"
      value={value}
      onChange={(e) =>
        handleTierFieldChange(tierId, field, parseInt(e.target.value, 10) || 0)
      }
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pricing Management</h1>
        <p className="text-muted-foreground text-sm">
          Manage tier pricing centrally and create clinic-specific offers for
          requested hospitals.
        </p>
      </div>

      {saveError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiers">Tier Pricing</TabsTrigger>
          <TabsTrigger value="offers">Clinic Offers</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle>Tier Pricing</CardTitle>
              <CardDescription>
                All prices are stored in cents/paise. The public pricing API
                converts them for display.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTiers ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading tiers...
                </div>
              ) : tiers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No tier pricing rows found. Run the seed script first.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Tier</TableHead>
                        <TableHead>Monthly (cents)</TableHead>
                        <TableHead>Patients</TableHead>
                        <TableHead>Appointments</TableHead>
                        <TableHead>Storage GB</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Patient Overage</TableHead>
                        <TableHead>Appt Overage</TableHead>
                        <TableHead>Rx Overage</TableHead>
                        <TableHead>Invoice Overage</TableHead>
                        <TableHead>OCR Overage</TableHead>
                        <TableHead>API Overage</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiers.map((tier) => (
                        <TableRow key={tier.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-xs">
                                {tier.tier}
                              </span>
                              {tier.isDirty && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-1 py-0 h-4"
                                >
                                  unsaved
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "monthlyBasePriceCents",
                              tier.monthlyBasePriceCents,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "includedPatients",
                              tier.includedPatients,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "includedAppointments",
                              tier.includedAppointments,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "includedStorageGB",
                              tier.includedStorageGB,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "includedUsers",
                              tier.includedUsers,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "overagePatientCents",
                              tier.overagePatientCents,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "overageAppointmentCents",
                              tier.overageAppointmentCents,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "overagePrescriptionCents",
                              tier.overagePrescriptionCents,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "overageInvoiceCents",
                              tier.overageInvoiceCents,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "overageOcrPageCents",
                              tier.overageOcrPageCents,
                            )}
                          </TableCell>
                          <TableCell>
                            {numericField(
                              tier.id,
                              "overageApiCallCents",
                              tier.overageApiCallCents,
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={tier.isDirty ? "default" : "outline"}
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={savingId === tier.id || !tier.isDirty}
                              onClick={() => saveTier(tier)}
                            >
                              {savingId === tier.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Save
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Clinic Offer Builder
              </CardTitle>
              <CardDescription>
                Grant special pricing to requested hospitals. The offer is
                stored per clinic and applied automatically in checkout and
                billing previews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick offer templates</p>
                <div className="flex flex-wrap gap-2">
                  {OFFER_TEMPLATES.map((template) => (
                    <Button
                      key={template.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => applyTemplate(template)}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Clinic</label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={offerForm.clinicId}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        clinicId: e.target.value,
                      }))
                    }
                    disabled={isLoadingClinics}
                  >
                    <option value="">
                      {isLoadingClinics ? "Loading clinics..." : "Select clinic"}
                    </option>
                    {clinicOptions.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Offer title</label>
                  <Input
                    value={offerForm.title}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="3 months free"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={offerForm.percentOff}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        percentOff: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (months)</label>
                  <Input
                    type="number"
                    min={1}
                    value={offerForm.durationMonths}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        durationMonths: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid until</label>
                  <Input
                    type="date"
                    value={offerForm.validUntil}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        validUntil: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={offerForm.description}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="In exchange for weekly feedback"
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-sm font-medium">Internal notes</label>
                  <Input
                    value={offerForm.notes}
                    onChange={(e) =>
                      setOfferForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Requested by founder / approved by sales"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOfferForm(DEFAULT_OFFER_FORM)}
                >
                  Reset
                </Button>
                <Button onClick={saveOffer} disabled={savingId !== null}>
                  {savingId === offerForm.clinicId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Save Offer
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Offers</CardTitle>
              <CardDescription>
                These offers are automatically applied to the next checkout
                preview for each clinic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOffers ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading offers...
                </div>
              ) : offers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No clinic offers are active yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-lg border bg-background p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {offer.clinic?.name ?? offer.clinicId}
                          </p>
                          <Badge variant="outline">{offer.percentOff}% off</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {offer.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {offer.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {offer.durationMonths
                            ? `${offer.durationMonths} month offer`
                            : "No fixed duration"}{" "}
                          {offer.validUntil ? ` • until ${offer.validUntil}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteOffer(offer.clinicId)}
                          disabled={savingId === offer.clinicId}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
