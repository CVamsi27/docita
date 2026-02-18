/**
 * AddonsSection
 *
 * SRP: Renders the Intelligence and WhatsApp add-on cards.
 * All pricing and purchase state is passed via props — no API calls here.
 */
"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import { AddonCard, type AddonFeature } from "./AddonCard";
import type { Feature } from "@workspace/types";

interface AddonsSectionProps {
  hasIntelligence: boolean;
  hasWhatsApp: boolean;
  intelligenceFeatures: AddonFeature[];
  whatsappPrice: number;
  purchasingId: string | null;
  currency: string;
  onPurchaseIntelligence: (cycle: "MONTHLY" | "YEARLY") => void;
  onPurchaseWhatsApp: (cycle: "MONTHLY" | "YEARLY") => void;
}

const WHATSAPP_FEATURES: AddonFeature[] = [
  {
    feature: "WA_MESSAGING" as Feature,
    details: {
      name: "WhatsApp Messaging",
      description: "Send automated messages to patients on WhatsApp",
      icon: MessageCircle,
    },
  },
  {
    feature: "WA_REMINDERS" as Feature,
    details: {
      name: "Appointment Reminders",
      description: "Reduce no-shows with automated reminders",
      icon: MessageCircle,
    },
  },
  {
    feature: "WA_DOCUMENT_SHARING" as Feature,
    details: {
      name: "Document Sharing",
      description: "Share prescriptions and reports instantly",
      icon: MessageCircle,
    },
  },
];

export function AddonsSection({
  hasIntelligence,
  hasWhatsApp,
  intelligenceFeatures,
  whatsappPrice,
  purchasingId,
  currency,
  onPurchaseIntelligence,
  onPurchaseWhatsApp,
}: AddonsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Powerful Add-ons</h2>
        <p className="text-sm text-muted-foreground">
          Enhance your plan with premium features
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <AddonCard
          title="Docita Intelligence"
          description="AI-Powered Add-on available for any tier. Smarter clinic management."
          icon={Sparkles}
          colorScheme="pink"
          features={intelligenceFeatures}
          isPurchased={hasIntelligence}
          pricing={{ monthly: 499, yearly: 4999 }}
          onPurchase={onPurchaseIntelligence}
          isLoading={purchasingId === "INTELLIGENCE"}
          currency={currency}
        />
        <AddonCard
          title="WhatsApp Integration"
          description="Connect with patients on their favorite platform. Automate communication."
          icon={MessageCircle}
          colorScheme="green"
          features={WHATSAPP_FEATURES}
          isPurchased={hasWhatsApp}
          pricing={{ monthly: whatsappPrice, yearly: whatsappPrice * 10 }}
          onPurchase={onPurchaseWhatsApp}
          isLoading={purchasingId === "WHATSAPP"}
          currency={currency}
        />
      </div>
    </div>
  );
}
