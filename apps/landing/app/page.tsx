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
import { StatsSection } from "@/components/sections/stats-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { TrustSecuritySection } from "@/components/sections/trust-security-section";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaBottomSection } from "@/components/sections/cta-bottom-section";
import { FooterSection } from "@/components/sections/footer-section";
import { StickyCta } from "@/components/sections/sticky-cta";
import { ROICalculator } from "@/components/roi-calculator";
import { FeatureComparisonTable } from "@/components/feature-comparison";
import { CaseStudiesSection } from "@/components/case-studies";

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

      <StatsSection />

      <PricingSection />

      <TestimonialsSection />

      <CaseStudiesSection />

      <TrustSecuritySection />

      <ROICalculator />

      <FaqSection />

      <FeatureComparisonTable />

      <CtaBottomSection />

      <FooterSection />

      <StickyCta />
    </div>
  );
}
