"use client";

import { useState, useEffect, useCallback } from "react";
import { billingAPI, type TierPricingRow, type AddOnRow } from "@/lib/api";
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
import { Loader2, Save } from "lucide-react";

interface EditableTierRow extends TierPricingRow {
  isDirty?: boolean;
}

export default function PricingPage() {
  const [tiers, setTiers] = useState<EditableTierRow[]>([]);
  const [addons, setAddons] = useState<AddOnRow[]>([]);
  const [isLoadingTiers, setIsLoadingTiers] = useState(true);
  const [isLoadingAddons, setIsLoadingAddons] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadTiers = useCallback(async () => {
    setIsLoadingTiers(true);
    try {
      const data = await billingAPI.getPricingTiers();
      setTiers(data);
    } finally {
      setIsLoadingTiers(false);
    }
  }, []);

  const loadAddons = useCallback(async () => {
    setIsLoadingAddons(true);
    try {
      const data = await billingAPI.getPricingAddons();
      setAddons(data);
    } finally {
      setIsLoadingAddons(false);
    }
  }, []);

  useEffect(() => {
    loadTiers();
    loadAddons();
  }, [loadTiers, loadAddons]);

  const handleTierFieldChange = (
    tierId: string,
    field: keyof TierPricingRow,
    value: number | string,
  ) => {
    setTiers((prev) =>
      prev.map((t) =>
        t.id === tierId ? { ...t, [field]: value, isDirty: true } : t,
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
        prev.map((t) => (t.id === tier.id ? { ...t, isDirty: false } : t)),
      );
    } catch {
      setSaveError(`Failed to save ${tier.name}`);
    } finally {
      setSavingId(null);
    }
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
        handleTierFieldChange(tierId, field, parseInt(e.target.value) || 0)
      }
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pricing Management</h1>
        <p className="text-muted-foreground text-sm">
          Edit tier and add-on pricing. Changes take effect immediately on the
          next pricing config fetch.
        </p>
      </div>

      {saveError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <Tabs defaultValue="tiers">
        <TabsList>
          <TabsTrigger value="tiers">Tier Pricing</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle>Tier Pricing</CardTitle>
              <CardDescription>
                All prices in smallest currency unit (paise for INR). The
                pricing API serves these values divided by 100.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTiers ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading tiers...
                </div>
              ) : tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
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
                        <TableHead>Overage: Patient</TableHead>
                        <TableHead>Overage: Appt</TableHead>
                        <TableHead>Overage: Rx</TableHead>
                        <TableHead>Overage: Invoice</TableHead>
                        <TableHead>Overage: OCR</TableHead>
                        <TableHead>Overage: API</TableHead>
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
                              className="h-7 px-2 text-xs gap-1"
                              disabled={
                                !tier.isDirty || savingId === tier.id
                              }
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

        <TabsContent value="addons">
          <Card>
            <CardHeader>
              <CardTitle>Add-on Pricing</CardTitle>
              <CardDescription>
                JSON objects stored per-tier. Edit the raw pricing JSON below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAddons ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading add-ons...
                </div>
              ) : (
                <div className="space-y-6">
                  {addons.map((addon) => (
                    <AddonEditor
                      key={addon.id}
                      addon={addon}
                      onSave={async (updated) => {
                        setSavingId(addon.id);
                        setSaveError(null);
                        try {
                          await billingAPI.updatePricingAddon(addon.id, updated);
                          setAddons((prev) =>
                            prev.map((a) =>
                              a.id === addon.id ? { ...a, ...updated } : a,
                            ),
                          );
                        } catch {
                          setSaveError(`Failed to save ${addon.name}`);
                        } finally {
                          setSavingId(null);
                        }
                      }}
                      isSaving={savingId === addon.id}
                    />
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

function AddonEditor({
  addon,
  onSave,
  isSaving,
}: {
  addon: AddOnRow;
  onSave: (data: Partial<AddOnRow>) => Promise<void>;
  isSaving: boolean;
}) {
  const [pricingJson, setPricingJson] = useState(
    JSON.stringify(addon.pricingByTier, null, 2),
  );
  const [overageJson, setOverageJson] = useState(
    JSON.stringify(addon.overageRateByTier, null, 2),
  );
  const [quotaJson, setQuotaJson] = useState(
    JSON.stringify(addon.includedQuotaByTier, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSave = async () => {
    setJsonError(null);
    try {
      const pricingByTier = JSON.parse(pricingJson);
      const overageRateByTier = JSON.parse(overageJson);
      const includedQuotaByTier = JSON.parse(quotaJson);
      await onSave({ pricingByTier, overageRateByTier, includedQuotaByTier });
    } catch {
      setJsonError("Invalid JSON in one of the fields.");
    }
  };

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{addon.name}</p>
          <p className="text-xs text-muted-foreground">{addon.type}</p>
        </div>
        <Button
          size="sm"
          className="gap-1"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </Button>
      </div>
      {jsonError && (
        <p className="text-xs text-destructive">{jsonError}</p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <p className="text-xs font-medium mb-1">Pricing by tier (cents)</p>
          <textarea
            className="w-full h-32 text-xs font-mono rounded-md border bg-muted p-2 resize-none"
            value={pricingJson}
            onChange={(e) => setPricingJson(e.target.value)}
          />
        </div>
        <div>
          <p className="text-xs font-medium mb-1">Included quota by tier</p>
          <textarea
            className="w-full h-32 text-xs font-mono rounded-md border bg-muted p-2 resize-none"
            value={quotaJson}
            onChange={(e) => setQuotaJson(e.target.value)}
          />
        </div>
        <div>
          <p className="text-xs font-medium mb-1">Overage rate by tier (cents)</p>
          <textarea
            className="w-full h-32 text-xs font-mono rounded-md border bg-muted p-2 resize-none"
            value={overageJson}
            onChange={(e) => setOverageJson(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
