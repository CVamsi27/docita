import type { useForm } from "react-hook-form";
import { Link } from "react-router";
import type { NotificationSettingsFormValues } from "@workspace/types";
import { CardDescription, FormControl, FormField, FormItem, Label, Switch } from "@workspace/ui/components";
import { Bell, Smartphone } from "lucide-react";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

type NotificationForm = ReturnType<typeof useForm<NotificationSettingsFormValues>>;

/** Toggle field shown when the workspace's plan includes WhatsApp messaging. */
function WhatsAppToggleField({ form }: { form: NotificationForm }) {
  return (
    <FormField
      control={form.control}
      name="whatsappNotifications"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between space-y-0 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-base">WhatsApp Notifications</Label>
              <CardDescription>
                Receive WhatsApp updates and reminders
              </CardDescription>
            </div>
          </div>
          <FormControl>
            <Switch
              checked={field.value ?? true}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/** Upsell shown in place of the toggle when the plan doesn't include WhatsApp messaging. */
function WhatsAppUpsellNotice() {
  return (
    <div className="flex flex-col gap-2 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          WhatsApp notifications
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        WhatsApp messaging is available on Essential and higher plans. Upgrade
        to enable automated WhatsApp reminders from this workspace.
      </p>
      <Link
        to={SUBSCRIPTION_SETTINGS_PATH}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        View plans and billing
      </Link>
    </div>
  );
}

/** WhatsApp notification field — toggle when available, upsell notice otherwise. */
export function WhatsAppNotificationSection({
  form,
  canWhatsApp,
}: {
  form: NotificationForm;
  canWhatsApp: boolean;
}) {
  return canWhatsApp ? (
    <WhatsAppToggleField form={form} />
  ) : (
    <WhatsAppUpsellNotice />
  );
}

/** In-app (push) notification toggle field. */
export function InAppNotificationSection({ form }: { form: NotificationForm }) {
  return (
    <FormField
      control={form.control}
      name="inAppNotifications"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between space-y-0 p-2">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <Label className="text-base">In-App Notifications</Label>
              <CardDescription>
                Show real-time alerts inside the app
              </CardDescription>
            </div>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
