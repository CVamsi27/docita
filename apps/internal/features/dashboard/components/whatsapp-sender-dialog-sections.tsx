"use client";

// jscpd:ignore-start
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
import { useTranslations } from "next-intl";
import type { WhatsappSenderConfigResponse, WhatsappSenderMode } from "@workspace/types";

/**
 * Phase 3 (per-feature): apps/internal Dashboard > WhatsApp sender
 * dialog sections. 6 literals converted to
 * useTranslations("InternalDashboard.whatsappSenderDialog").
 */
function useWhatsappSenderTranslations() {
  return useTranslations("InternalDashboard.whatsappSenderDialog");
}

export const MODE_OPTIONS: readonly WhatsappSenderMode[] = ["SHARED", "BYO", "MANAGED"];

export function isWhatsappSenderMode(value: string): value is WhatsappSenderMode {
  return value === "SHARED" || value === "BYO" || value === "MANAGED";
}

type TriggerProps = {
  onOpen: () => void;
};

export function WhatsappSenderTrigger({ onOpen }: TriggerProps) {
  const t = useWhatsappSenderTranslations();
  return (
    <SymbolTooltip label={t("triggerTooltip")}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpen}
        aria-label={t("triggerAriaLabel")}
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
  const t = useWhatsappSenderTranslations();
  if (!config) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("currentStatusLabel")}</span>
      <Badge variant={config.status === "VERIFIED" ? "default" : "secondary"}>
        {config.status.replace(/_/g, " ")}
      </Badge>
      {config.displayName ? (
        <span className="text-muted-foreground">· {config.displayName}</span>
      ) : null}
      {config.fallbackActive ? (
        <Badge variant="destructive">{t("fallbackBadge")}</Badge>
      ) : null}
    </div>
  );
}

type ModeSelectorProps = {
  mode: WhatsappSenderMode;
  onModeChange: (mode: WhatsappSenderMode) => void;
};

export function WhatsappSenderModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const t = useWhatsappSenderTranslations();
  return (
    <div className="space-y-2">
      <Label htmlFor="ws-mode">{t("modeLabel")}</Label>
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
              {t("modeOption", { mode: m })}
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
  const t = useWhatsappSenderTranslations();
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="ws-phone-id">{t("phoneIdLabel")}</Label>
        <Input
          id="ws-phone-id"
          value={phoneNumberId}
          onChange={(e) => onPhoneNumberIdChange(e.target.value)}
          placeholder={t("phoneIdPlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-waba-id">{t("wabaIdLabel")}</Label>
        <Input
          id="ws-waba-id"
          value={wabaId}
          onChange={(e) => onWabaIdChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ws-token">{t("tokenLabel")}</Label>
        <Input
          id="ws-token"
          type="password"
          value={accessToken}
          onChange={(e) => onAccessTokenChange(e.target.value)}
          placeholder={
            hasExistingPhoneNumber
              ? t("tokenKeepPlaceholder")
              : t("tokenNewPlaceholder")
          }
        />
        <p className="text-xs text-muted-foreground">
          {t("tokenHelper")}
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
  const t = useWhatsappSenderTranslations();
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <Button
        type="button"
        variant="ghost"
        onClick={onRevoke}
        disabled={loading || !canVerifyOrRevoke}
      >
        {t("resetButton")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onVerify}
        disabled={loading || !canVerifyOrRevoke}
      >
        {t("verifyButton")}
      </Button>
      <Button type="button" onClick={onSave} disabled={loading}>
        {t("saveButton")}
      </Button>
    </div>
  );
}

type ErrorProps = {
  lastVerifyError: string | undefined | null;
};

export function WhatsappSenderError({ lastVerifyError }: ErrorProps) {
  const t = useWhatsappSenderTranslations();
  if (!lastVerifyError) return null;

  return (
    <p className="text-sm text-destructive">
      {t("errorLabel", { error: lastVerifyError })}
    </p>
  );
}
