// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  useRevokeWhatsappSender,
  useUpdateWhatsappSender,
  useVerifyWhatsappSender,
  useWhatsappSender,
  useWhatsappStats,
} from "@workspace/data-access";
import {
  ModeSelector,
  ByoFormFields,
  ManagedOnboardingNotice,
  SenderActionButtons,
  VerifiedSenderInfo,
  DeliverabilityCard,
} from "./WhatsappSenderSettingsSections";

export function WhatsappSenderSettings() {
  const sender = useWhatsappSender();
  const stats = useWhatsappStats();
  const updateSender = useUpdateWhatsappSender();
  const verifySender = useVerifyWhatsappSender();
  const revokeSender = useRevokeWhatsappSender();
  const [mode, setMode] = useState<"SHARED" | "BYO" | "MANAGED">("SHARED");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    if (sender.data) {
      setMode(sender.data.mode as "SHARED" | "BYO" | "MANAGED");
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
            <ModeSelector
              mode={mode}
              allowedModes={allowedModes}
              onChange={setMode}
            />
            {mode === "BYO" ? (
              <ByoFormFields
                phoneNumberId={phoneNumberId}
                wabaId={wabaId}
                accessToken={accessToken}
                onPhoneNumberIdChange={setPhoneNumberId}
                onWabaIdChange={setWabaId}
                onAccessTokenChange={setAccessToken}
              />
            ) : null}
            {mode === "MANAGED" ? <ManagedOnboardingNotice /> : null}
            <SenderActionButtons
              onSave={save}
              isSavePending={updateSender.isPending}
              onVerify={() => verifySender.mutate()}
              isVerifyDisabled={mode === "SHARED"}
              isVerifyPending={verifySender.isPending}
              onReset={() => revokeSender.mutate()}
              isResetPending={revokeSender.isPending}
            />
            <VerifiedSenderInfo
              displayName={sender.data?.displayName}
              lastVerifyError={sender.data?.lastVerifyError}
            />
          </CardContent>
        </Card>
        <DeliverabilityCard stats={stats} />
      </div>
    </DataState>
  );
}
