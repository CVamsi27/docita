import { useState, useEffect } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, Input, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components";
import { Save, Sparkles } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api/api-client";

interface TierPricing { id: string; tier: string; monthlyBasePriceCents: number; includedPatients: number; includedAppointments: number; includedStorageGB: number; includedUsers: number; overagePatientCents: number; overageAppointmentCents: number; overagePrescriptionCents: number; overageInvoiceCents: number; overageOcrPageCents: number; overageApiCallCents: number; }
interface Offer { id: string; clinicId: string; title: string; percentOff: number; durationMonths: number; validUntil?: string; }

const TIER_PRICING_FIELDS = [
  "monthlyBasePriceCents",
  "includedPatients",
  "includedAppointments",
  "includedStorageGB",
  "includedUsers",
  "overagePatientCents",
  "overageAppointmentCents",
  "overagePrescriptionCents",
  "overageInvoiceCents",
  "overageOcrPageCents",
  "overageApiCallCents",
] as const satisfies readonly (keyof TierPricing)[];

export function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<TierPricing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tierData, offerData] = await Promise.all([
        apiGet<TierPricing[]>("/api/internal/billing/pricing/tiers"),
        apiGet<Offer[]>("/api/internal/billing/pricing/offers"),
      ]);
      setTiers(tierData);
      setOffers(offerData);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); }, []);

  const saveTier = async (tier: TierPricing) => {
    setSavingId(tier.id);
    try {
      await apiPut(`/api/internal/billing/pricing/tiers/${tier.id}`, tier);
    } catch { /* ignore */ }
    finally { setSavingId(null); }
  };

  const updateTierField = (tierId: string, field: keyof TierPricing, value: string) => {
    setTiers((prev) => prev.map((t) => t.id === tierId ? { ...t, [field]: parseInt(value, 10) || 0 } : t));
  };

  return (
    <AppPageScaffold header={<PageHeader title="Pricing Management" description="Configure tier pricing, limits, and overage rates" />}>
      <DataState status={loading ? "loading" : "success"} loadingMessage="Loading pricing\u2026">
        <Tabs defaultValue="tiers" className="space-y-4">
          <TabsList><TabsTrigger value="tiers"><Sparkles className="mr-2 h-4 w-4" /> Tier Pricing</TabsTrigger>
            <TabsTrigger value="offers">Facility Offers</TabsTrigger></TabsList>

          <TabsContent value="tiers">
            <Card><CardHeader><CardTitle>Tier Pricing</CardTitle><CardDescription>Configure monthly pricing, limits, and overage rates for each tier</CardDescription></CardHeader>
              <CardContent>
                {tiers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground"><Sparkles className="h-10 w-10 mb-4" /><p>No tier pricing configured</p></div>
                ) : (
                  <div className="overflow-x-auto"><Table className="min-w-[96rem]">
                    <TableHeader><TableRow>
                      <TableHead className="w-28">Tier</TableHead><TableHead>Monthly (&cent;)</TableHead><TableHead>Patients</TableHead>
                      <TableHead>Appts</TableHead><TableHead>Storage</TableHead><TableHead>Users</TableHead>
                      <TableHead>Pt Overage</TableHead><TableHead>Appt Overage</TableHead><TableHead>Rx Overage</TableHead>
                      <TableHead>Inv Overage</TableHead><TableHead>OCR Overage</TableHead><TableHead>API Overage</TableHead><TableHead />
                    </TableRow></TableHeader>
                    <TableBody>{tiers.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-medium">{tier.tier}</TableCell>
                        {TIER_PRICING_FIELDS.map((field) => (
                          <TableCell key={field}>
                            <Input type="number" className="w-16 h-7 text-xs" value={tier[field]}
                              onChange={(e) => { updateTierField(tier.id, field, e.target.value); }} />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={savingId === tier.id}
                            onClick={() => { void saveTier(tier); }}><Save className="h-3 w-3 mr-1" /> Save</Button>
                        </TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers">
            <Card><CardHeader><CardTitle>Facility Offers</CardTitle><CardDescription>Custom discount offers for specific clinics</CardDescription></CardHeader>
              <CardContent>
                {offers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No offers created yet.</p>
                ) : (
                  <div className="rounded-md border"><Table><TableHeader><TableRow>
                    <TableHead>Title</TableHead><TableHead>Discount</TableHead><TableHead>Duration</TableHead><TableHead>Valid Until</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">{offer.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-green-600">{offer.percentOff}% off</Badge></TableCell>
                      <TableCell>{offer.durationMonths}mo</TableCell>
                      <TableCell>{offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}</TableBody></Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DataState>
    </AppPageScaffold>
  );
}
