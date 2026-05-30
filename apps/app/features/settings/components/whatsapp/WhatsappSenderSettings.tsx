"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { labelMapKeys } from "@workspace/utils";
import {
  useRevokeWhatsappSender,
  useUpdateWhatsappSender,
  useVerifyWhatsappSender,
  useWhatsappSender,
  useWhatsappStats,
} from "@workspace/data-access";

type SenderMode = "SHARED" | "BYO" | "MANAGED";

const MODE_LABELS: Record<SenderMode, string> = {
  SHARED: "Shared Docita sender",
  BYO: "Clinic WhatsApp number",
  MANAGED: "Docita-managed onboarding",
};

export function WhatsappSenderSettings() {
  const sender = useWhatsappSender();
  const stats = useWhatsappStats();
  const updateSender = useUpdateWhatsappSender();
  const verifySender = useVerifyWhatsappSender();
  const revokeSender = useRevokeWhatsappSender();
  const [mode, setMode] = useState<SenderMode>("SHARED");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    if (sender.data) {
      setMode(sender.data.mode);
      setPhoneNumberId(sender.data.phoneNumberId ?? "");
      setWabaId(sender.data.wabaId ?? "");
      setAccessToken("");
    }
  }, [sender.data]);

  const allowedModes = useMemo(
    () => new Set(sender.data?.allowedModes ?? ["SHARED"]),
    [sender.data?.allowedModes],
  );

  const status = sender.data?.status ?? "NOT_CONFIGURED";

  const save = () => {
    if (mode === "BYO") {
      updateSender.mutate({
        mode,
        phoneNumberId,
        wabaId: wabaId || undefined,
        accessToken,
      });
      return;
    }
    updateSender.mutate({ mode });
  };

  return (
    <DataState
      status={
        sender.isLoading ? "loading" : sender.isError ? "error" : "success"
      }
      loadingMessage="Loading WhatsApp sender settings..."
      errorMessage={sender.error?.message}
      onRetry={() => sender.refetch()}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">WhatsApp sender</CardTitle>
              <Badge variant={status === "VERIFIED" ? "default" : "secondary"}>
                {status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {labelMapKeys(MODE_LABELS).map((item) => {
                const disabled = !allowedModes.has(item);
                const selected = mode === item;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMode(item)}
                    className={[
                      "rounded-lg border p-4 text-left transition-colors duration-150",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/40",
                      disabled ? "cursor-not-allowed opacity-50" : "",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      {item === "SHARED" ? (
                        <MessageCircle className="size-4" />
                      ) : item === "BYO" ? (
                        <ShieldCheck className="size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      <span className="text-sm font-medium">
                        {MODE_LABELS[item]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {disabled
                        ? "Upgrade required for this sender mode."
                        : item === "SHARED"
                          ? "Messages include the clinic name in content."
                          : item === "BYO"
                            ? "Use a verified Meta phone number ID and token."
                            : "Provisioned with Docita support."}
                    </p>
                  </button>
                );
              })}
            </div>

            {mode === "BYO" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone-number-id">
                    Phone number ID
                  </Label>
                  <Input
                    id="whatsapp-phone-number-id"
                    value={phoneNumberId}
                    onChange={(event) => setPhoneNumberId(event.target.value)}
                    placeholder="Enter phone number ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-waba-id">WABA ID</Label>
                  <Input
                    id="whatsapp-waba-id"
                    value={wabaId}
                    onChange={(event) => setWabaId(event.target.value)}
                    placeholder="Enter WABA ID"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="whatsapp-access-token">Access token</Label>
                  <Input
                    id="whatsapp-access-token"
                    type="password"
                    value={accessToken}
                    onChange={(event) => setAccessToken(event.target.value)}
                    placeholder="Enter access token"
                  />
                </div>
              </div>
            ) : null}

            {mode === "MANAGED" ? (
              <p className="text-sm text-muted-foreground">
                Managed onboarding is prepared for support-assisted
                provisioning.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={save}
                disabled={updateSender.isPending}
              >
                Save sender
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => verifySender.mutate()}
                disabled={mode === "SHARED" || verifySender.isPending}
              >
                Verify
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => revokeSender.mutate()}
                disabled={revokeSender.isPending}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>

            {sender.data?.displayName ? (
              <p className="text-sm text-muted-foreground">
                Verified sender: {sender.data.displayName}
              </p>
            ) : null}
            {sender.data?.lastVerifyError ? (
              <p className="text-sm text-destructive">
                {sender.data.lastVerifyError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deliverability (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {stats.isLoading ? (
              <p className="text-muted-foreground">Loading delivery metrics…</p>
            ) : stats.data ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Outbound messages</span>
                  <span className="font-medium">
                    {stats.data.outboundLast30Days ?? 0}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">Delivery rate</span>
                  <span className="font-medium">
                    {stats.data.deliveryRate === null ||
                    stats.data.deliveryRate === undefined
                      ? "—"
                      : `${stats.data.deliveryRate}%`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    Stale (no final status &gt;6h)
                  </span>
                  <Badge
                    variant={
                      (stats.data.staleDeliveryCount ?? 0) > 0
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {stats.data.staleDeliveryCount ?? 0}
                  </Badge>
                </div>
                {(stats.data.staleDeliveryCount ?? 0) > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Some messages have not received a delivery webhook from Meta.
                    They remain queued for ops review — nothing was auto-marked
                    failed.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">
                Delivery metrics are unavailable right now.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DataState>
  );
}
