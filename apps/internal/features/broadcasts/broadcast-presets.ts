export type BroadcastPresetId =
  | "docita_intro_v1"
  | "docita_hospital_referral_partner_v1"
  | "docita_pharmacy_referral_partner_v1";

export interface BroadcastPreset {
  id: BroadcastPresetId;
  label: string;
  audienceLabel: string;
  metaTemplateName: string;
  description: string;
  body: string;
}

const CONTACT_BLOCK =
  "🌐 docita.work\n" +
  "📧 support@docita.work\n" +
  "📞 +91 87903 11010";

export const BROADCAST_PRESETS: BroadcastPreset[] = [
  {
    id: "docita_intro_v1",
    label: "Docita — Intro & Contact",
    audienceLabel: "General",
    metaTemplateName: "docita_intro_v1",
    description:
      "Generic Docita intro with contact details. Use for any audience where you just want to share who Docita is and how to reach us.",
    body:
      "Hi {{name}}, this is Docita.\n\n" +
      "We work with clinics and hospitals across India. If you'd like to learn more or get in touch, here's where to reach us:\n\n" +
      CONTACT_BLOCK,
  },
  {
    id: "docita_hospital_referral_partner_v1",
    label: "Existing Hospital Customers — Refer Hospitals (5% revenue share)",
    audienceLabel: "Existing Hospital Customers",
    metaTemplateName: "docita_hospital_referral_partner_v1",
    description:
      "Audience: hospitals already using Docita. Asks them to refer other hospitals in exchange for a 5% revenue share of the new hospital's first-year subscription.",
    body:
      "Hi {{name}}, thanks for being on Docita.\n\n" +
      "We're now onboarding more hospitals — and we'd love your help. If you connect us to a hospital that signs up:\n" +
      "• 5% of their first-year subscription, paid to you quarterly\n" +
      "• You stay in the loop — we keep you posted on every referral\n\n" +
      "All we need is the hospital name, city, and a contact person. We do the rest.\n\n" +
      "Reply REFER to get started.\n\n" +
      CONTACT_BLOCK,
  },
  {
    id: "docita_pharmacy_referral_partner_v1",
    label: "Pharmacies — Refer Hospitals (₹1,000 / hospital that goes live)",
    audienceLabel: "Pharmacies",
    metaTemplateName: "docita_pharmacy_referral_partner_v1",
    description:
      "Audience: pharmacies. Pitches them as referral partners — refer a hospital that goes live on Docita, earn ₹1,000.",
    body:
      "Hi {{name}}, Docita is now onboarding hospitals — and we pay pharmacies who refer them.\n\n" +
      "₹1,000 referral fee per hospital that goes live on Docita.\n\n" +
      "All we need from you is the hospital name, city, and a contact person. We do the rest.\n\n" +
      "Reply REFER to get started.\n\n" +
      CONTACT_BLOCK,
  },
];

export function getBroadcastPreset(id: BroadcastPresetId): BroadcastPreset {
  const preset = BROADCAST_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Unknown broadcast preset: ${id}`);
  }
  return preset;
}
