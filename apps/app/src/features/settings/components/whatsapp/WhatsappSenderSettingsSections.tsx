import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import { MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";

type SenderMode = "SHARED" | "BYO" | "MANAGED";

const UI_MODES = ["DOCITA_MANAGED", "BYO"] as const;
type UiSenderMode = (typeof UI_MODES)[number];

function uiModeLabel(mode: UiSenderMode, t: (key: string) => string) {
  return {
    title: t(mode === "BYO" ? "byoTitle" : "managedTitle"),
    description: t(mode === "BYO" ? "byoDescription" : "managedDescription"),
  };
}

function backendToUi(mode: SenderMode): UiSenderMode {
  return mode === "BYO" ? "BYO" : "DOCITA_MANAGED";
}

function uiToBackend(mode: UiSenderMode): SenderMode {
  return mode === "BYO" ? "BYO" : "SHARED";
}

export function ModeSelector({
  mode,
  allowedModes,
  onChange,
}: {
  mode: SenderMode;
  allowedModes: Set<string>;
  onChange: (mode: SenderMode) => void;
}) {
  const { t } = useTranslation("WhatsApp.senderSettingsSections");
  const uiMode = backendToUi(mode);
  const byoAllowed = allowedModes.has("BYO");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {UI_MODES.map((key) => {
        const selected = uiMode === key;
        const disabled = key === "BYO" && !byoAllowed;
        const info = uiModeLabel(key, t);
        return (
          <Button
            key={key}
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(uiToBackend(key))}
            className={[
              "rounded-lg p-4 text-left h-auto justify-start",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-background hover:bg-muted/40",
              disabled ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
            aria-label={t("modeAriaLabel", { mode: info.title })}
          >
            <div className="mb-2 flex items-center gap-2">
              {key === "DOCITA_MANAGED" ? (
                <MessageCircle className="size-4 text-primary" />
              ) : (
                <ShieldCheck className="size-4 text-primary" />
              )}
              <span className="text-sm font-medium">{info.title}</span>
              {selected && (
                <Badge variant="default" className="ml-auto text-xs">
                  {t("activeBadge")}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {disabled ? t("upgradeRequired") : info.description}
            </p>
          </Button>
        );
      })}
    </div>
  );
}

export function ByoFormFields({
  phoneNumberId,
  wabaId,
  accessToken,
  onPhoneNumberIdChange,
  onWabaIdChange,
  onAccessTokenChange,
}: {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  onPhoneNumberIdChange: (value: string) => void;
  onWabaIdChange: (value: string) => void;
  onAccessTokenChange: (value: string) => void;
}) {
  const { t } = useTranslation("WhatsApp.senderSettingsSections");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="whatsapp-phone-number-id">
          {t("phoneNumberIdLabel")}
        </Label>
        <Input
          id="whatsapp-phone-number-id"
          value={phoneNumberId}
          onChange={(event) => onPhoneNumberIdChange(event.target.value)}
          placeholder={t("phoneNumberIdPlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp-waba-id">{t("wabaIdLabel")}</Label>
        <Input
          id="whatsapp-waba-id"
          value={wabaId}
          onChange={(event) => onWabaIdChange(event.target.value)}
          placeholder={t("wabaIdPlaceholder")}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="whatsapp-access-token">{t("accessTokenLabel")}</Label>
        <Input
          id="whatsapp-access-token"
          type="password"
          value={accessToken}
          onChange={(event) => onAccessTokenChange(event.target.value)}
          placeholder={t("accessTokenPlaceholder")}
        />
      </div>
    </div>
  );
}

export function SenderActionButtons({
  onSave,
  isSavePending,
  onVerify,
  isVerifyDisabled,
  isVerifyPending,
  onReset,
  isResetPending,
}: {
  onSave: () => void;
  isSavePending: boolean;
  onVerify: () => void;
  isVerifyDisabled: boolean;
  isVerifyPending: boolean;
  onReset: () => void;
  isResetPending: boolean;
}) {
  const { t } = useTranslation("WhatsApp.senderSettingsSections");
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={onSave}
        disabled={isSavePending}
      >
        {t("saveSender")}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onVerify}
        disabled={isVerifyDisabled || isVerifyPending}
      >
        {t("verify")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onReset}
        disabled={isResetPending}
      >
        <RotateCcw className="size-4" />
        {t("reset")}
      </Button>
    </div>
  );
}

export function VerifiedSenderInfo({
  displayName,
  lastVerifyError,
}: {
  displayName?: string | null;
  lastVerifyError?: string | null;
}) {
  const { t } = useTranslation("WhatsApp.senderSettingsSections");
  return (
    <>
      {displayName ? (
        <p className="text-sm text-muted-foreground">
          {t("verifiedSender", { name: displayName })}
        </p>
      ) : null}
      {lastVerifyError ? (
        <p className="text-sm text-destructive">
          {lastVerifyError}
        </p>
      ) : null}
    </>
  );
}

export function DeliverabilityCard({
  stats,
}: {
  stats: {
    isLoading: boolean;
    data?: {
      outboundLast30Days?: number | null;
      deliveryRate?: number | null;
      staleDeliveryCount?: number | null;
    } | null;
  };
}) {
  const { t } = useTranslation("WhatsApp.senderSettingsSections");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("deliverabilityTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {stats.isLoading ? (
          <p className="text-muted-foreground">{t("deliveryLoading")}</p>
        ) : stats.data ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {t("outboundMessages")}
              </span>
              <span className="font-medium">
                {stats.data.outboundLast30Days ?? 0}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">{t("deliveryRate")}</span>
              <span className="font-medium">
                {stats.data.deliveryRate === null ||
                stats.data.deliveryRate === undefined
                  ? "—"
                  : `${stats.data.deliveryRate}%`}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                {t("staleLabel")}
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
                {t("staleNote")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">
            {t("deliveryUnavailable")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
