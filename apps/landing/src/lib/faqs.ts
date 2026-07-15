interface FaqEntry {
  q: string;
  a: string;
}

/**
 * Single source of truth for the homepage FAQ. Used by:
 * - FaqCtaSection (renders the human-readable list)
 * - index.astro (passes through to MainLayout for FAQPage JSON-LD)
 */
export const HOMEPAGE_FAQS: ReadonlyArray<FaqEntry> = [
  {
    q: "How fast can my facility actually go live?",
    a: "Discovery call on day zero, first workflow live within 48 hours, and full rollout (queue + EMR + prescriptions + billing + WhatsApp) inside two weeks for standard practices. Larger or multi-doctor hospital rollouts plan around your team's calendar, not ours.",
  },
  {
    q: "What about my existing patient list and scans?",
    a: "Bring Excel, CSV, and uploaded scans on day one. We import the patient list, run OCR on prior prescriptions and case sheets, and review duplicates and extracted fields before anything lands in records. No starting from zero.",
  },
  {
    q: "Is patient data safe and India-compliant?",
    a: "Backend services and database are co-located in Mumbai (ap-south-1) for India residency. Encrypted in transit and at rest, role-based access for reception/doctor/admin, audit logs on sensitive actions, consent-aware WhatsApp, and one-click data export. We describe what we operate today rather than claim unsupported certifications.",
  },
  {
    q: "How does pricing work, and what does setup include?",
    a: "Monthly software plans from \u20B9499. Guided setup (patient import, prescription templates, letterhead, signature, WhatsApp templates, billing config, and staff training) is scoped separately and starts from \u20B94,999. Higher tiers add multi-doctor, lab tests, inventory, analytics, and broader rollouts.",
  },
  {
    q: "Do my reception staff need training, and is the UI in English?",
    a: "Reception and clinical workflows are in English today. The interface is built for non-technical staff: large primary actions, consistent left-to-right reading order, and inline help where it matters. We provide a 60-minute live training during setup and recorded walkthroughs you can replay during shifts.",
  },
  {
    q: "Can I keep using my existing WhatsApp Business number?",
    a: "Yes. We connect to your WhatsApp Business API credentials in Settings; the clinic becomes the sender, not a personal number. Templates, consent posture, and delivery health live in the same workspace. Sender credentials are admin-only.",
  },
  {
    q: "What happens if the internet goes down mid-consultation?",
    a: "The active consult keeps your last-saved draft and queues writes locally. The console surfaces a soft banner so the doctor knows what is queued, and the queue drains as soon as the connection returns. Critical actions are designed to fail safely, not silently.",
  },
  {
    q: "Can I export my data if I ever want to leave?",
    a: "Yes. Patients, prescriptions, invoices, and audit logs export to CSV. PDFs and structured FHIR-like bundles are available for prescriptions. There is no lock-in: data export is one of the trust controls we list publicly.",
  },
  {
    q: "Is there a free trial or demo I can show my partners?",
    a: "There is no time-limited free trial; instead, we offer guided setup so you evaluate with a real workflow, not a sandbox. Book a 30-minute walkthrough and we will show your actual flow on Docita with sample data tailored to your specialty.",
  },
];

/** Schema.org FAQPage JSON-LD built from HOMEPAGE_FAQS. */
export function buildFaqPageStructuredData(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: siteUrl,
    mainEntity: HOMEPAGE_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}
