import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import { MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";

type SenderMode = "SHARED" | "BYO" | "MANAGED";
type UiSenderMode = "DOCITA_MANAGED" | "BYO";

const UI_MODE_LABELS: Record<UiSenderMode, { title: string; description: string }> = {
  DOCITA_MANAGED: {
    title: "Docita-managed",
    description:
      "Use Docita's shared WhatsApp number. Messages include your clinic name. No setup required.",
  },
  BYO: {
    title: "Your own number",
    description:
      "Connect a verified Meta WhatsApp Business number. Full brand ownership, requires Meta API credentials.",
  },
};

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
  const uiMode = backendToUi(mode);
  const byoAllowed = allowedModes.has("BYO");

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(Object.keys(UI_MODE_LABELS) as UiSenderMode[]).map((key) => {
        const selected = uiMode === key;
        const disabled = key === "BYO" && !byoAllowed;
        const info = UI_MODE_LABELS[key];
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
            aria-label={`${info.title} mode`}
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
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {disabled
                ? "Upgrade required for this option."
                : info.description}
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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="whatsapp-phone-number-id">
          Phone number ID
        </Label>
        <Input
          id="whatsapp-phone-number-id"
          value={phoneNumberId}
          onChange={(event) => onPhoneNumberIdChange(event.target.value)}
          placeholder="Enter phone number ID"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp-waba-id">WABA ID</Label>
        <Input
          id="whatsapp-waba-id"
          value={wabaId}
          onChange={(event) => onWabaIdChange(event.target.value)}
          placeholder="Enter WABA ID"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="whatsapp-access-token">Access token</Label>
        <Input
          id="whatsapp-access-token"
          type="password"
          value={accessToken}
          onChange={(event) => onAccessTokenChange(event.target.value)}
          placeholder="Enter access token"
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
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={onSave}
        disabled={isSavePending}
      >
        Save sender
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onVerify}
        disabled={isVerifyDisabled || isVerifyPending}
      >
        Verify
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onReset}
        disabled={isResetPending}
      >
        <RotateCcw className="size-4" />
        Reset
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
  return (
    <>
      {displayName ? (
        <p className="text-sm text-muted-foreground">
          Verified sender: {displayName}
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Deliverability (30 days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {stats.isLoading ? (
          <p className="text-muted-foreground">Loading delivery metrics...</p>
        ) : stats.data ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                Outbound messages
              </span>
              <span className="font-medium">
                {stats.data.outboundLast30Days ?? 0}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Delivery rate</span>
              <span className="font-medium">
                {stats.data.deliveryRate === null ||
                stats.data.deliveryRate === undefined
                  ? "\u2014"
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
                Some messages have not received a delivery webhook from
                Meta. They remain queued for ops review.
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
  );
}
