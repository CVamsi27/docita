"use client";

import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { ValuePropsSection } from "@/components/sections/value-props-section";
import { QueueSection } from "@/components/sections/queue-section";
import { MedicalCodingSection } from "@/components/sections/medical-coding-section";
import { LabInventorySection } from "@/components/sections/lab-inventory-section";
import { SpecialtiesSection } from "@/components/sections/specialties-section";
import { AnalyticsSection } from "@/components/sections/analytics-section";
import { AiAutomationSection } from "@/components/sections/ai-automation-section";
import { WhatsappSection } from "@/components/sections/whatsapp-section";
import { FeaturesGridSection } from "@/components/sections/features-grid-section";
import { TrustSecuritySection } from "@/components/sections/trust-security-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaBottomSection } from "@/components/sections/cta-bottom-section";
import { FooterSection } from "@/components/sections/footer-section";
import { StickyCta } from "@/components/sections/sticky-cta";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <SiteHeader />

      <HeroSection />

      <HowItWorksSection />

      <ValuePropsSection />

      <QueueSection />

      <MedicalCodingSection />

      <LabInventorySection />

      <SpecialtiesSection />

      <AnalyticsSection />

      <AiAutomationSection />

      <WhatsappSection />

      <FeaturesGridSection />

      <TrustSecuritySection />

      <PricingSection />

      <FaqSection />

      <CtaBottomSection />

      <FooterSection />

      <StickyCta />
    </div>
  );
}
