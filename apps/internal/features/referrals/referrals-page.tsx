"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  type CreateInternalReferrerInput,
  type ReferrerType,
  useInternalReferralPayouts,
  useInternalReferralPayoutSummary,
  useInternalReferrers,
} from "@workspace/data-access/internal";
import { internalQueryKeys } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
// jscpd:ignore-start — shared Select import block matches other consumers
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
// jscpd:ignore-end
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

const REFERRER_TYPES: ReferrerType[] = [
  "MARKETING_PERSON",
  "PHARMACY",
  "CLINIC",
  "CUSTOM",
];

function rupees(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Phase 3 (per-feature): referrals page is the apps/internal admin
 * view of referral partners and their payout ledger. 20 literals
 * converted to useTranslations("InternalReferrals"). Dynamic data
 * (referrer.name, payout.status, currency formatting) stays
 * unchanged.
 */
function useReferralsTranslations() {
  return useTranslations("InternalReferrals");
}

export default function ReferralsPage() {
  const t = useReferralsTranslations();
  const { token, isInternal } = useAuth();
  const enabled = Boolean(isInternal && token);
  const queryClient = useQueryClient();

  const referrers = useInternalReferrers(token, { enabled });
  const payouts = useInternalReferralPayouts(token, "", { enabled });
  const summary = useInternalReferralPayoutSummary(token, { enabled });

  const [form, setForm] = useState<CreateInternalReferrerInput>({
    type: "MARKETING_PERSON",
    name: "",
    email: "",
    phone: "",
  });

  const createReferrer = useMutation({
    mutationFn: (input: CreateInternalReferrerInput) =>
      client.post("/internal/referrers", input),
    onSuccess: () => {
      toast.success(t("referrerCreatedToast"));
      setForm({ type: "MARKETING_PERSON", name: "", email: "", phone: "" });
      void queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.referrers(),
      });
    },
    onError: (error) =>
      showUserFacingErrorToast(
        error,
        t("referrerCreateError"),
        "generic",
      ),
  });

  const markPaid = useMutation({
    mutationFn: (payoutId: string) =>
      client.post(`/internal/referral-payouts/${payoutId}/mark-paid`, {}),
    onSuccess: () => {
      toast.success(t("payoutMarkedPaidToast"));
      void queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.referralPayoutsRoot(),
      });
    },
    onError: (error) =>
      showUserFacingErrorToast(
        error,
        t("payoutMarkPaidError"),
        "generic",
      ),
  });

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("payoutSummary")}</h2>
        <div className="flex flex-wrap gap-3">
          {(summary.data ?? []).map((row) => (
            <div
              key={row.status}
              className="rounded-lg border px-4 py-3 text-sm"
            >
              <div className="text-muted-foreground">{row.status}</div>
              <div className="text-lg font-semibold">{rupees(row.totalCents)}</div>
              <div className="text-xs text-muted-foreground">
                {t("payoutsCount", { count: row.count })}
              </div>
            </div>
          ))}
          {summary.data && summary.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noPayoutsYet")}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("addReferrer")}</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.name.trim()) {
              toast.warning(t("nameRequiredWarning"));
              return;
            }
            createReferrer.mutate({
              ...form,
              email: form.email || undefined,
              phone: form.phone || undefined,
            });
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{t("typeLabel")}</span>
            <Select
              value={form.type}
              onValueChange={(value) => {
                const next = REFERRER_TYPES.find((type) => type === value);
                if (next) setForm((prev) => ({ ...prev, type: next }));
              }}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFERRER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{t("nameLabel")}</span>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder={t("namePlaceholder")}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{t("emailLabel")}</span>
            <Input
              value={form.email ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder={t("optionalPlaceholder")}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">{t("phoneLabel")}</span>
            <Input
              value={form.phone ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              placeholder={t("optionalPlaceholder")}
            />
          </label>
          <Button type="submit" disabled={createReferrer.isPending}>
            {createReferrer.isPending ? t("saving") : t("addButton")}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("referrers")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colType")}</TableHead>
              <TableHead>{t("colReward")}</TableHead>
              <TableHead>{t("colContact")}</TableHead>
              <TableHead>{t("colActive")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(referrers.data ?? []).map((referrer) => (
              <TableRow key={referrer.id}>
                <TableCell>{referrer.name}</TableCell>
                <TableCell>{referrer.type}</TableCell>
                <TableCell>{referrer.rewardKind}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {referrer.email ?? referrer.phone ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={referrer.active ? "default" : "secondary"}>
                    {referrer.active ? t("active") : t("inactive")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t("payoutLedger")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colPeriodStart")}</TableHead>
              <TableHead>{t("colBaseRevenue")}</TableHead>
              <TableHead>{t("colRate")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(payouts.data ?? []).map((payout) => (
              <TableRow key={payout.id}>
                <TableCell className="text-xs">
                  {payout.periodStart.slice(0, 10)}
                </TableCell>
                <TableCell>{rupees(payout.baseRevenueCents)}</TableCell>
                <TableCell>{payout.ratePercent}%</TableCell>
                <TableCell className="font-medium">
                  {rupees(payout.amountCents)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={payout.status === "PAID" ? "default" : "secondary"}
                  >
                    {payout.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {payout.status === "PENDING" ||
                  payout.status === "APPROVED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={markPaid.isPending}
                      onClick={() => markPaid.mutate(payout.id)}
                    >
                      {t("markPaidButton")}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
