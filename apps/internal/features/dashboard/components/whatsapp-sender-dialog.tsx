"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import {
  type WhatsappSenderConfigResponse,
  whatsappSenderConfigResponseSchema,
  type WhatsappSenderMode,
} from "@workspace/types";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

const MODE_LABELS: Record<WhatsappSenderMode, string> = {
  SHARED: "Shared Docita number",
  BYO: "Clinic's own number",
  MANAGED: "Docita-managed dedicated",
};

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
      <SymbolTooltip label="WhatsApp sender">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="WhatsApp sender"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
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
            {config ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Current status:</span>
                <Badge variant={config.status === "VERIFIED" ? "default" : "secondary"}>
                  {config.status.replace(/_/g, " ")}
                </Badge>
                {config.displayName ? (
                  <span className="text-muted-foreground">
                    · {config.displayName}
                  </span>
                ) : null}
                {config.fallbackActive ? (
                  <Badge variant="destructive">Falling back to shared</Badge>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="ws-mode">Mode</Label>
              <Select
                value={mode}
                onValueChange={(val) => setMode(val as WhatsappSenderMode)}
              >
                <SelectTrigger id="ws-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_LABELS) as WhatsappSenderMode[]).map(
                    (m) => (
                      <SelectItem key={m} value={m}>
                        {MODE_LABELS[m]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {mode === "BYO" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ws-phone-id">Phone number ID</Label>
                  <Input
                    id="ws-phone-id"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="From Meta business → WhatsApp manager"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-waba-id">WABA ID (optional)</Label>
                  <Input
                    id="ws-waba-id"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-token">Access token</Label>
                  <Input
                    id="ws-token"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={
                      config?.phoneNumberId
                        ? "Leave blank to keep existing token"
                        : "Paste Meta system-user token"
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored encrypted in ClinicSecret. Existing token stays in
                    place unless you replace it here.
                  </p>
                </div>
              </div>
            ) : null}

            {config?.lastVerifyError ? (
              <p className="text-sm text-destructive">
                Last verify error: {config.lastVerifyError}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={revoke}
                disabled={loading || config?.mode === "SHARED"}
              >
                Reset to shared
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={verify}
                disabled={loading || config?.mode === "SHARED"}
              >
                Verify with Meta
              </Button>
              <Button type="button" onClick={save} disabled={loading}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
