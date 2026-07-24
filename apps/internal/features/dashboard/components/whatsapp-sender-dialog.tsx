"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";
import { type WhatsappSenderConfigResponse, whatsappSenderConfigResponseSchema, type WhatsappSenderMode } from "@workspace/types";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { WhatsappSenderActions, WhatsappSenderByoFields, WhatsappSenderError, WhatsappSenderModeSelector, WhatsappSenderStatus, WhatsappSenderTrigger } from "./whatsapp-sender-dialog-sections";

type WhatsappSenderDialogProps = {
  clinicId: string;
  clinicName: string;
};

export function WhatsappSenderDialog({
  clinicId,
  clinicName,
}: WhatsappSenderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<WhatsappSenderConfigResponse | null>(
    null,
  );
  const [mode, setMode] = useState<WhatsappSenderMode>("SHARED");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const basePath = `/internal/clinics/${clinicId}/whatsapp-sender`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await client.get(basePath);
      const data = whatsappSenderConfigResponseSchema.parse(raw);
      setConfig(data);
      setMode(data.mode);
      setPhoneNumberId(data.phoneNumberId ?? "");
      setWabaId(data.wabaId ?? "");
      setAccessToken("");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "Could not load WhatsApp sender configuration.",
        "load",
      );
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [load, open]);

  const save = async () => {
    if (mode === "BYO" && (!phoneNumberId.trim() || !accessToken.trim())) {
      showUserFacingErrorToast(
        "Enter the clinic number details before saving.",
      );
      return;
    }
    setLoading(true);
    try {
      const body =
        mode === "BYO"
          ? {
              mode,
              phoneNumberId: phoneNumberId.trim(),
              wabaId: wabaId.trim() || undefined,
              accessToken: accessToken.trim(),
            }
          : { mode };
      const raw = await client.put(basePath, body);
      const data = whatsappSenderConfigResponseSchema.parse(raw);
      setConfig(data);
      setAccessToken("");
      toast.success("WhatsApp sender updated.");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "Could not update WhatsApp sender.",
        "save",
      );
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await client.post(`${basePath}/verify`, {});
      toast.success("Verification triggered.");
      await load();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "Verification failed.",
        "save",
      );
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    if (!confirm("Reset this clinic to the shared Docita number?")) return;
    setLoading(true);
    try {
      await client.delete(basePath);
      toast.success("Reset to shared Docita number.");
      await load();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "Could not reset WhatsApp sender.",
        "save",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <WhatsappSenderTrigger onOpen={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>WhatsApp sender — {clinicName}</DialogTitle>
            <DialogDescription>
              Choose which WhatsApp number this facility sends from. Defaults to
              the shared Docita number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <WhatsappSenderStatus config={config} />

            <WhatsappSenderModeSelector
              mode={mode}
              onModeChange={setMode}
            />

            {mode === "BYO" ? (
              <WhatsappSenderByoFields
                phoneNumberId={phoneNumberId}
                onPhoneNumberIdChange={setPhoneNumberId}
                wabaId={wabaId}
                onWabaIdChange={setWabaId}
                accessToken={accessToken}
                onAccessTokenChange={setAccessToken}
                hasExistingPhoneNumber={!!config?.phoneNumberId}
              />
            ) : null}

            <WhatsappSenderError lastVerifyError={config?.lastVerifyError} />

            <WhatsappSenderActions
              loading={loading}
              canVerifyOrRevoke={config?.mode !== "SHARED"}
              onSave={save}
              onVerify={verify}
              onRevoke={revoke}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
