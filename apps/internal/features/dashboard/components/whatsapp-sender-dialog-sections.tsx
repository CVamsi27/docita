"use client";

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
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { MessageCircle } from "lucide-react";
import type { WhatsappSenderConfigResponse, WhatsappSenderMode } from "@workspace/types";

export const MODE_LABELS: Record<WhatsappSenderMode, string> = {
  SHARED: "Shared Docita number",
  BYO: "Clinic's own number",
  MANAGED: "Docita-managed dedicated",
};

export const MODE_OPTIONS: readonly WhatsappSenderMode[] = ["SHARED", "BYO", "MANAGED"];

export function isWhatsappSenderMode(value: string): value is WhatsappSenderMode {
  return value === "SHARED" || value === "BYO" || value === "MANAGED";
}

type TriggerProps = {
  onOpen: () => void;
};

export function WhatsappSenderTrigger({ onOpen }: TriggerProps) {
  return (
    <SymbolTooltip label="WhatsApp sender">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpen}
        aria-label="WhatsApp sender"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </SymbolTooltip>
  );
}

type StatusProps = {
  config: WhatsappSenderConfigResponse | null;
};

export function WhatsappSenderStatus({ config }: StatusProps) {
  if (!config) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Current status:</span>
      <Badge variant={config.status === "VERIFIED" ? "default" : "secondary"}>
        {config.status.replace(/_/g, " ")}
      </Badge>
      {config.displayName ? (
        <span className="text-muted-foreground">· {config.displayName}</span>
      ) : null}
      {config.fallbackActive ? (
        <Badge variant="destructive">Falling back to shared</Badge>
      ) : null}
    </div>
  );
}

type ModeSelectorProps = {
  mode: WhatsappSenderMode;
  onModeChange: (mode: WhatsappSenderMode) => void;
};

export function WhatsappSenderModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="ws-mode">Mode</Label>
      <Select
        value={mode}
        onValueChange={(val) => {
          if (isWhatsappSenderMode(val)) onModeChange(val);
        }}
      >
        <SelectTrigger id="ws-mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODE_OPTIONS.map((m) => (
            <SelectItem key={m} value={m}>
              {MODE_LABELS[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type ByoFieldsProps = {
  phoneNumberId: string;
  onPhoneNumberIdChange: (value: string) => void;
  wabaId: string;
  onWabaIdChange: (value: string) => void;
  accessToken: string;
  onAccessTokenChange: (value: string) => void;
  hasExistingPhoneNumber: boolean;
};

export function WhatsappSenderByoFields({
  phoneNumberId,
  onPhoneNumberIdChange,
  wabaId,
  onWabaIdChange,
  accessToken,
  onAccessTokenChange,
  hasExistingPhoneNumber,
}: ByoFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="ws-phone-id">Phone number ID</Label>
        <Input
          id="ws-phone-id"
          value={phoneNumberId}
          onChange={(e) => onPhoneNumberIdChange(e.target.value)}
          placeholder="From Meta business → WhatsApp manager"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-waba-id">WABA ID (optional)</Label>
        <Input
          id="ws-waba-id"
          value={wabaId}
          onChange={(e) => onWabaIdChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-token">Access token</Label>
        <Input
          id="ws-token"
          type="password"
          value={accessToken}
          onChange={(e) => onAccessTokenChange(e.target.value)}
          placeholder={
            hasExistingPhoneNumber
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
  );
}

type ActionsProps = {
  loading: boolean;
  canVerifyOrRevoke: boolean;
  onSave: () => void;
  onVerify: () => void;
  onRevoke: () => void;
};

export function WhatsappSenderActions({
  loading,
  canVerifyOrRevoke,
  onSave,
  onVerify,
  onRevoke,
}: ActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <Button
        type="button"
        variant="ghost"
        onClick={onRevoke}
        disabled={loading || !canVerifyOrRevoke}
      >
        Reset to shared
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onVerify}
        disabled={loading || !canVerifyOrRevoke}
      >
        Verify with Meta
      </Button>
      <Button type="button" onClick={onSave} disabled={loading}>
        Save
      </Button>
    </div>
  );
}

type ErrorProps = {
  lastVerifyError: string | undefined | null;
};

export function WhatsappSenderError({ lastVerifyError }: ErrorProps) {
  if (!lastVerifyError) return null;

  return (
    <p className="text-sm text-destructive">
      Last verify error: {lastVerifyError}
    </p>
  );
}
