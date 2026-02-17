import {
  PrismaClient,
  ClinicTier,
  AddOnType,
  DiscountType,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed the usage-based pricing configuration
 * All prices are in paise (1 INR = 100 paise)
 */
async function seedPricing() {
  console.log("Seeding pricing configuration...");

  // ============================================================================
  // Tier Pricing Configuration
  // ============================================================================
  const tierPricing = [
    {
      tier: ClinicTier.CAPTURE,
      monthlyBasePriceCents: 0, // Free
      includedPatients: 50,
      includedAppointments: 100,
      includedStorageGB: 1,
      includedUsers: 1,
      overagePatientCents: 0, // Upgrade required
      overageAppointmentCents: 0,
      overageStorageCents: 0,
      overageUserCents: 0,
      name: "Capture",
      description:
        "Paper-to-digital bridge for solo practitioners starting out",
      tagline: "Free forever",
      color: "gray",
      displayOrder: 0,
      features: JSON.stringify([
        "Up to 50 patients",
        "Basic patient records",
        "Excel/PDF import",
        "Manual data export",
        "Community support",
        "Single user only",
      ]),
    },
    {
      tier: ClinicTier.CORE,
      monthlyBasePriceCents: 79900, // ₹799
      includedPatients: 300,
      includedAppointments: 500,
      includedStorageGB: 5,
      includedUsers: 1,
      overagePatientCents: 200, // ₹2 per patient
      overageAppointmentCents: 100, // ₹1 per appointment
      overageStorageCents: 5000, // ₹50 per GB
      overageUserCents: 29900, // ₹299 per user
      name: "Core",
      description: "Full-function EHR for individual practitioners",
      tagline: "Solo Clinic Essentials",
      color: "blue",
      displayOrder: 1,
      features: JSON.stringify([
        "300 active patients included",
        "500 appointments/month",
        "Calendar & scheduling",
        "Digital prescriptions",
        "ICD-10 medical coding",
        "Basic analytics dashboard",
        "Email support",
      ]),
    },
    {
      tier: ClinicTier.PLUS,
      monthlyBasePriceCents: 199900, // ₹1,999
      includedPatients: 1000,
      includedAppointments: 2000,
      includedStorageGB: 20,
      includedUsers: 2,
      overagePatientCents: 150, // ₹1.50 per patient
      overageAppointmentCents: 75, // ₹0.75 per appointment
      overageStorageCents: 4000, // ₹40 per GB
      overageUserCents: 29900, // ₹299 per user
      name: "Plus",
      description: "Scale & customize for growing practices",
      tagline: "Growth Ready",
      color: "green",
      displayOrder: 2,
      features: JSON.stringify([
        "1,000 active patients included",
        "2,000 appointments/month",
        "Everything in Core",
        "Prescription templates",
        "Custom form fields",
        "Clinic branding",
        "Priority email support",
        "2 users included",
      ]),
    },
    {
      tier: ClinicTier.PRO,
      monthlyBasePriceCents: 399900, // ₹3,999
      includedPatients: 5000,
      includedAppointments: 8000,
      includedStorageGB: 100,
      includedUsers: 5,
      overagePatientCents: 100, // ₹1 per patient
      overageAppointmentCents: 50, // ₹0.50 per appointment
      overageStorageCents: 3000, // ₹30 per GB
      overageUserCents: 49900, // ₹499 per doctor, ₹99 for staff
      name: "Pro",
      description: "Multi-doctor clinics with advanced needs",
      tagline: "Multi-Doctor Clinics",
      color: "purple",
      displayOrder: 3,
      features: JSON.stringify([
        "5,000 active patients included",
        "8,000 appointments/month",
        "Everything in Plus",
        "Up to 5 doctors included",
        "10 staff users included",
        "Advanced analytics",
        "Revenue reports",
        "API access (10,000 calls/mo)",
        "Phone support",
        "Role-based permissions",
        "Audit logs",
      ]),
    },
    {
      tier: ClinicTier.ENTERPRISE,
      monthlyBasePriceCents: 0, // Custom pricing
      includedPatients: 999999,
      includedAppointments: 999999,
      includedStorageGB: 500,
      includedUsers: 999,
      overagePatientCents: 0,
      overageAppointmentCents: 0,
      overageStorageCents: 0,
      overageUserCents: 0,
      name: "Enterprise",
      description: "Hospitals & clinic chains - Contact Sales",
      tagline: "Hospital-Grade",
      color: "amber",
      displayOrder: 4,
      features: JSON.stringify([
        "Unlimited patients",
        "Unlimited appointments",
        "Everything in Pro",
        "Unlimited doctors",
        "Unlimited branches",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee (99.9%)",
        "On-premise option",
        "Custom training",
        "White-label option",
      ]),
    },
  ];

  for (const tier of tierPricing) {
    await prisma.tierPricing.upsert({
      where: { tier: tier.tier },
      update: tier,
      create: tier,
    });
    console.log(`  ✓ ${tier.name} tier pricing`);
  }

  // ============================================================================
  // Add-On Products
  // ============================================================================
  const addOns = [
    {
      type: AddOnType.WHATSAPP,
      name: "WhatsApp Integration",
      description: "Automated patient communication via WhatsApp",
      icon: "MessageSquare",
      pricingByTier: JSON.stringify({
        CORE: 49900, // ₹499
        PLUS: 79900, // ₹799
        PRO: 149900, // ₹1,499
        ENTERPRISE: 0, // Custom
      }),
      includedQuotaByTier: JSON.stringify({
        CORE: 500, // messages/month
        PLUS: 1500,
        PRO: 5000,
        ENTERPRISE: 15000,
      }),
      overageRateByTier: JSON.stringify({
        CORE: 50, // ₹0.50 per message
        PLUS: 40, // ₹0.40
        PRO: 30, // ₹0.30
        ENTERPRISE: 20, // ₹0.20
      }),
      features: JSON.stringify([
        "Appointment reminders",
        "Prescription sharing",
        "Follow-up notifications",
        "Birthday/wellness messages",
        "Two-way messaging",
        "Message templates",
        "Delivery reports",
        "Opt-out management",
      ]),
    },
    {
      type: AddOnType.INTELLIGENCE,
      name: "Docita Intelligence",
      description: "AI-powered clinical assistant",
      icon: "Sparkles",
      pricingByTier: JSON.stringify({
        CORE: 199900, // ₹1,999
        PLUS: 249900, // ₹2,499
        PRO: 349900, // ₹3,499
        ENTERPRISE: 0, // Custom
      }),
      includedQuotaByTier: JSON.stringify({
        CORE: 500, // AI credits/month
        PLUS: 1500,
        PRO: 5000,
        ENTERPRISE: 15000,
      }),
      overageRateByTier: JSON.stringify({
        CORE: 300, // ₹3 per credit
        PLUS: 250, // ₹2.50
        PRO: 200, // ₹2
        ENTERPRISE: 150, // ₹1.50
      }),
      features: JSON.stringify([
        "AI-assisted clinical notes (5 credits/note)",
        "Smart prescription suggestions (2 credits)",
        "Voice-to-text dictation (1 credit/minute)",
        "Predictive no-show alerts (1 credit)",
        "Patient risk segmentation (3 credits)",
        "Anomaly detection (2 credits)",
        "Treatment insights (5 credits)",
        "Automated ICD-10/CPT coding (3 credits)",
      ]),
    },
  ];

  for (const addOn of addOns) {
    await prisma.addOn.upsert({
      where: { type: addOn.type },
      update: addOn,
      create: addOn,
    });
    console.log(`  ✓ ${addOn.name} add-on`);
  }

  // ============================================================================
  // Discount Configuration
  // ============================================================================
  const discounts = [
    {
      type: DiscountType.ANNUAL_COMMITMENT,
      percentOff: 10,
      maxCombinedPercent: 20,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: false,
      minCommitmentMonths: 12,
      name: "Annual Commitment",
      description: "Save 10% with annual billing",
      badgeText: "Save 10%",
    },
    {
      type: DiscountType.SEMI_ANNUAL_COMMITMENT,
      percentOff: 5,
      maxCombinedPercent: 15,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: false,
      minCommitmentMonths: 6,
      name: "Semi-Annual Commitment",
      description: "Save 5% with 6-month billing",
      badgeText: "Save 5%",
    },
    {
      type: DiscountType.LOYALTY_1_YEAR,
      percentOff: 5,
      maxCombinedPercent: 20,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: false,
      minTenureMonths: 12,
      name: "1 Year Loyalty",
      description: "5% loyalty discount after 1 year",
      badgeText: null,
    },
    {
      type: DiscountType.LOYALTY_2_YEARS,
      percentOff: 7,
      maxCombinedPercent: 20,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: false,
      minTenureMonths: 24,
      name: "2 Year Loyalty",
      description: "7% loyalty discount after 2 years",
      badgeText: null,
    },
    {
      type: DiscountType.LOYALTY_3_YEARS,
      percentOff: 10,
      maxCombinedPercent: 20,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: false,
      minTenureMonths: 36,
      name: "3+ Year Loyalty",
      description: "10% loyalty discount after 3+ years",
      badgeText: null,
    },
    {
      type: DiscountType.REFERRAL_NEW_CUSTOMER,
      percentOff: 100, // 1 month free (100% of first month)
      maxCombinedPercent: null,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: false,
      name: "Referral Welcome",
      description: "First month free when referred",
      badgeText: "1 Month Free",
    },
    {
      type: DiscountType.GOVERNMENT,
      percentOff: 30,
      maxCombinedPercent: 30,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: true,
      name: "Government Hospital",
      description: "30% discount for government hospitals",
      badgeText: null,
    },
    {
      type: DiscountType.NGO,
      percentOff: 40,
      maxCombinedPercent: 40,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: true,
      name: "NGO/Non-Profit",
      description: "40% discount for NGOs and non-profits",
      badgeText: null,
    },
    {
      type: DiscountType.MEDICAL_COLLEGE,
      percentOff: 50,
      maxCombinedPercent: 50,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: true,
      name: "Medical College",
      description: "50% discount for medical teaching institutions",
      badgeText: null,
    },
    {
      type: DiscountType.RURAL_HEALTH,
      percentOff: 40,
      maxCombinedPercent: 40,
      appliesToBase: true,
      appliesToAddOns: true,
      appliesToOverage: true,
      name: "Rural Health Center",
      description: "40% discount for rural health centers",
      badgeText: null,
    },
    {
      type: DiscountType.STARTUP_CLINIC,
      percentOff: 25,
      maxCombinedPercent: 25,
      appliesToBase: true,
      appliesToAddOns: false,
      appliesToOverage: false,
      name: "Startup Clinic",
      description: "25% off for first year for new clinics (<1 year old)",
      badgeText: null,
    },
  ];

  for (const discount of discounts) {
    await prisma.discount.upsert({
      where: { type: discount.type },
      update: discount,
      create: discount,
    });
    console.log(`  ✓ ${discount.name} discount`);
  }

  console.log("\n✅ Pricing configuration seeded successfully!");
}

// Main execution
seedPricing()
  .catch((e) => {
    console.error("❌ Error seeding pricing:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
