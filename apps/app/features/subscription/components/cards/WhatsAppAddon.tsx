import { Check, MessageCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

interface WhatsAppAddonProps {
  purchased: boolean;
  selected: boolean;
  onToggle: (selected: boolean) => void;
  currency?: string;
  price?: number;
}

const WHATSAPP_FEATURES = [
  {
    name: "Appointment Reminders",
    description: "Automated schedule reminders and 30-min headers",
    icon: MessageCircle,
  },
  {
    name: "Patient Alerts",
    description: "Confirmation requests and delay notifications",
    icon: MessageCircle,
  },
  {
    name: "Document Sharing",
    description: "Send prescriptions and invoices directly via WhatsApp",
    icon: MessageCircle,
  },
  {
    name: "Two-way Messaging",
    description: "Chat with patients with delivery & read receipts",
    icon: MessageCircle,
  },
];

export function WhatsAppAddon({
  purchased,
  selected,
  onToggle,
  currency = "INR",
  price,
}: WhatsAppAddonProps) {
  const currencySymbol = currency === "INR" ? "₹" : "$";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 transition-all",
        purchased
          ? "border-emerald-500/50 bg-linear-to-br from-emerald-50 via-green-50/50 to-background dark:from-emerald-950/30 dark:via-green-950/20 dark:to-slate-900/50 dark:border-emerald-700/30"
          : selected
            ? "border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-emerald-200/50 hover:border-emerald-300 dark:border-emerald-800/30 dark:hover:border-emerald-700/50",
      )}
    >
      {/* Decorative gradient blurs */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-emerald-500/10" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 dark:bg-green-500/10" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-green-600 shadow-lg">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Communication
              </Badge>
            </div>
            <CardTitle className="text-xl text-emerald-700 dark:text-emerald-300">
              WhatsApp Integration
            </CardTitle>
            <CardDescription className="text-emerald-600/80 dark:text-emerald-400/70">
              Official WhatsApp Business API Integration
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {!purchased && price !== undefined && (
              <div className="text-right">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {currencySymbol}
                  {price.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-600/70 dark:text-emerald-400/60 block">
                  per month
                </span>
              </div>
            )}
            <Button
              variant={
                purchased ? "secondary" : selected ? "default" : "outline"
              }
              className={cn(
                "shadow-lg min-w-[140px]",
                !purchased &&
                  !selected &&
                  "border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30",
                selected &&
                  !purchased &&
                  "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
                purchased &&
                  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 cursor-not-allowed",
              )}
              onClick={() => !purchased && onToggle(!selected)}
              disabled={purchased}
            >
              {purchased ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Active
                </>
              ) : selected ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Selected
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Add WhatsApp
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {WHATSAPP_FEATURES.map((feature) => (
            <div
              key={feature.name}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/50 border border-emerald-200/50 dark:border-emerald-800/30 backdrop-blur-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
                <feature.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  {feature.name}
                </p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 line-clamp-2">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
