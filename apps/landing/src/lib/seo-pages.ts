export interface SeoLandingPageSection {
  title: string;
  body: string;
  bullets?: string[];
}

export interface SeoLandingPage {
  slug: string;
  keyword: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  primaryUseCase: string;
  fit: string[];
  sections: SeoLandingPageSection[];
  relatedSlugs: string[];
}

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "clinic-management-software-india",
    keyword: "Clinic management software India",
    title: "Clinic Management Software India | Docita",
    description:
      "Docita helps Indian private clinics manage appointments, OPD flow, EMR, prescriptions, billing, reminders, and patient communication from one workspace.",
    h1: "Clinic management software for Indian private clinics",
    intro:
      "Docita is built for clinics that still depend on paper files, Excel sheets, and scattered WhatsApp messages. Start with today's appointments and expand into records, billing, prescriptions, and follow-ups as the team gets comfortable.",
    primaryUseCase:
      "Best for clinics that want one operating layer for reception, doctors, billing, and patient communication.",
    fit: [
      "Solo and multi-doctor clinics",
      "Reception-led appointment and billing workflows",
      "Clinics moving from paper, Excel, or disconnected tools",
    ],
    sections: [
      {
        title: "What the clinic gets in one workflow",
        body: "Appointments, queue, patient records, consultation notes, prescriptions, invoices, WhatsApp reminders, and patient portal access stay connected to the same clinic record.",
      },
      {
        title: "Why this matters in India",
        body: "Most private clinics need a practical rollout, not a long implementation. Docita keeps the front desk and doctor workflow together so the clinic can digitize without pausing care.",
      },
      {
        title: "Rollout approach",
        body: "Begin with one doctor, one front desk user, and one live workflow. Add historical records and advanced settings after the team is stable.",
      },
    ],
    relatedSlugs: [
      "opd-management-software",
      "doctor-appointment-software",
      "emr-for-indian-clinics",
    ],
  },
  {
    slug: "opd-management-software",
    keyword: "OPD management software",
    title: "OPD Management Software | Docita",
    description:
      "Run OPD appointments, queue, consultations, prescriptions, billing, and follow-ups in a connected Docita workflow.",
    h1: "OPD management software for busy clinic days",
    intro:
      "Docita helps OPD teams keep the day's patient flow visible from booking to consultation, billing, and follow-up. The goal is fewer handoffs and less dependence on memory.",
    primaryUseCase:
      "Best for clinics and hospitals that need front desk, doctors, and billing to work from the same OPD view.",
    fit: [
      "Daily OPD queue and appointment control",
      "Doctor consultation handoff from reception",
      "Billing and follow-up linked to the visit",
    ],
    sections: [
      {
        title: "Front desk and doctor alignment",
        body: "Reception can organize arrivals while doctors see patient context and continue the visit from the same system.",
      },
      {
        title: "Patient journey continuity",
        body: "OPD activity can move from appointment to clinical notes, prescription, invoice, and follow-up without rebuilding context in each step.",
      },
      {
        title: "Hospital OPD ready",
        body: "For small hospitals, OPD can be the first controlled workflow before broader department rollout.",
      },
    ],
    relatedSlugs: [
      "hospital-opd-software",
      "doctor-appointment-software",
      "clinic-billing-software",
    ],
  },
  {
    slug: "doctor-appointment-software",
    keyword: "Doctor appointment software",
    title: "Doctor Appointment Software | Docita",
    description:
      "Docita helps clinics manage doctor appointments, availability, patient booking requests, queue flow, and reminders from one clinic workspace.",
    h1: "Doctor appointment software that fits clinic operations",
    intro:
      "Docita keeps appointment scheduling close to doctor availability, reception workflow, patient records, and reminders. It is designed for real clinic days, not only calendar entries.",
    primaryUseCase:
      "Best for clinics that need appointments connected to queue, consultation, reminders, and patient records.",
    fit: [
      "Doctor-wise availability and slots",
      "Public booking requests with staff confirmation",
      "Reception handoff into the OPD queue",
    ],
    sections: [
      {
        title: "Booking without losing control",
        body: "Public booking can collect requests while staff still confirm the visit before the appointment is final.",
      },
      {
        title: "Fewer missed handoffs",
        body: "Appointment context stays available for the front desk and doctor, reducing repeated data entry during consultation.",
      },
      {
        title: "Reminder-ready",
        body: "Appointment workflows connect naturally to WhatsApp reminders and follow-up communication where configured.",
      },
    ],
    relatedSlugs: [
      "whatsapp-appointment-reminder-software",
      "opd-management-software",
      "clinic-management-software-india",
    ],
  },
  {
    slug: "digital-prescription-software",
    keyword: "Digital prescription software",
    title: "Digital Prescription Software | Docita",
    description:
      "Create clinic prescriptions linked to patient records, consultation context, medicines, PDFs, and patient-facing sharing links in Docita.",
    h1: "Digital prescription software for Indian clinics",
    intro:
      "Docita helps doctors create prescriptions inside the same workflow used for appointments, consultation notes, patient records, and follow-ups.",
    primaryUseCase:
      "Best for clinics that want prescription history, PDF sharing, and consultation context in one place.",
    fit: [
      "Prescription PDFs for patients",
      "Medication instructions linked to the patient record",
      "Professional patient-facing sharing links",
    ],
    sections: [
      {
        title: "Prescription history stays searchable",
        body: "Past prescriptions remain attached to the patient record instead of being scattered across WhatsApp media and paper files.",
      },
      {
        title: "Designed for clinical responsibility",
        body: "Docita supports documentation and workflow. Medical judgment remains with the clinician.",
      },
      {
        title: "Patient-friendly sharing",
        body: "Prescription links and PDFs include subtle Docita attribution while keeping the clinic and clinician as the primary context.",
      },
    ],
    relatedSlugs: [
      "emr-for-indian-clinics",
      "clinic-management-software-india",
      "whatsapp-appointment-reminder-software",
    ],
  },
  {
    slug: "clinic-billing-software",
    keyword: "Clinic billing software",
    title: "Clinic Billing Software | Docita",
    description:
      "Docita connects clinic invoices, payment tracking, patient billing history, and consultation billing workflows.",
    h1: "Clinic billing software connected to the patient visit",
    intro:
      "Docita helps clinics create invoices from the same patient and visit context used by reception and doctors. Billing stays connected without turning the clinic workflow into a separate accounting maze.",
    primaryUseCase:
      "Best for clinics that want invoice creation, payment status, and patient billing history tied to care workflows.",
    fit: [
      "Consultation and service invoices",
      "Patient-level invoice history",
      "Payment desk for open invoices",
    ],
    sections: [
      {
        title: "Billing after the visit",
        body: "Clinic teams can keep billing close to consultation and patient records instead of copying details into a separate system.",
      },
      {
        title: "Open invoices stay actionable",
        body: "Payment Desk focuses on collectible invoices while the full invoice ledger remains available for history and review.",
      },
      {
        title: "Professional patient artifacts",
        body: "Invoice links and PDFs include subtle Docita attribution without distracting from clinic billing details.",
      },
    ],
    relatedSlugs: [
      "opd-management-software",
      "clinic-management-software-india",
      "hospital-opd-software",
    ],
  },
  {
    slug: "whatsapp-appointment-reminder-software",
    keyword: "WhatsApp appointment reminder software",
    title: "WhatsApp Appointment Reminder Software | Docita",
    description:
      "Use Docita to connect WhatsApp appointment reminders, prescription sharing, receipts, and follow-ups to clinic workflows.",
    h1: "WhatsApp appointment reminders connected to clinic workflow",
    intro:
      "Docita treats WhatsApp as part of the clinic workflow, not as a separate inbox. Reminders and patient messages work best when they are connected to appointments, prescriptions, invoices, and follow-ups.",
    primaryUseCase:
      "Best for clinics that already use WhatsApp and want reminders tied to real appointment and patient context.",
    fit: [
      "Appointment reminder workflows",
      "Prescription and invoice sharing links",
      "Follow-up communication connected to patient records",
    ],
    sections: [
      {
        title: "Less manual reminder work",
        body: "When appointment data is structured, reminder workflows can be planned from the clinic schedule instead of memory.",
      },
      {
        title: "Professional patient links",
        body: "Patient-facing links remain clear, private, and branded without turning clinical communication into advertising.",
      },
      {
        title: "Consent-aware communication",
        body: "Docita keeps communication controls close to the patient workflow so clinics can manage consent and expectations responsibly.",
      },
    ],
    relatedSlugs: [
      "doctor-appointment-software",
      "digital-prescription-software",
      "clinic-management-software-india",
    ],
  },
  {
    slug: "hospital-opd-software",
    keyword: "Hospital OPD software",
    title: "Hospital OPD Software | Docita",
    description:
      "Docita helps small hospitals organize OPD appointments, doctor workflows, billing, follow-ups, and patient communication.",
    h1: "Hospital OPD software for connected outpatient flow",
    intro:
      "Docita can support small hospital OPD teams by giving reception, doctors, billing, and administration one connected operating picture for outpatient work.",
    primaryUseCase:
      "Best for small hospitals that want to start with OPD before expanding to wider operational workflows.",
    fit: [
      "Multi-doctor OPD schedules",
      "Front desk and consultation handoff",
      "Billing and follow-up linked to outpatient visits",
    ],
    sections: [
      {
        title: "Start with OPD",
        body: "OPD is often the right first workflow because it touches patient arrival, consultation, billing, and follow-up without requiring a full hospital rewrite.",
      },
      {
        title: "Shared operational visibility",
        body: "Teams can understand what is booked, waiting, being seen, billed, and pending follow-up from connected surfaces.",
      },
      {
        title: "Roll out in phases",
        body: "A phased approach keeps the first release practical and reduces disruption for doctors and front desk staff.",
      },
    ],
    relatedSlugs: [
      "opd-management-software",
      "clinic-billing-software",
      "doctor-appointment-software",
    ],
  },
  {
    slug: "paper-to-cloud-clinic-software",
    keyword: "Paper to cloud clinic software",
    title: "Paper to Cloud Clinic Software | Docita",
    description:
      "Move clinic records, appointments, prescriptions, billing, and follow-up workflows from paper or Excel into Docita in phases.",
    h1: "Paper to cloud clinic software without stopping the clinic",
    intro:
      "Docita is designed for clinics that need a practical migration path from paper registers, Excel sheets, and WhatsApp-based memory into a connected digital workflow.",
    primaryUseCase:
      "Best for clinics that want to digitize gradually while continuing daily operations.",
    fit: [
      "Paper register and Excel migration",
      "First workflow rollout before full data cleanup",
      "Assisted setup for doctors and front desk users",
    ],
    sections: [
      {
        title: "Start small",
        body: "Begin with the workflow causing the most friction: appointments, prescriptions, billing, reminders, or patient records.",
      },
      {
        title: "Review before import",
        body: "Historical data should be mapped, reviewed, and cleaned before it becomes part of the clinic record.",
      },
      {
        title: "Keep staff comfortable",
        body: "A rollout works best when one live clinic workflow becomes useful quickly, then additional workflows are added in sequence.",
      },
    ],
    relatedSlugs: [
      "clinic-management-software-india",
      "emr-for-indian-clinics",
      "opd-management-software",
    ],
  },
  {
    slug: "emr-for-indian-clinics",
    keyword: "EMR for Indian clinics",
    title: "EMR for Indian Clinics | Docita",
    description:
      "Docita gives Indian clinics patient records, consultation context, prescriptions, documents, metrics, billing history, and patient portal access.",
    h1: "EMR for Indian clinics that connects to the full visit",
    intro:
      "Docita keeps EMR work connected to appointments, consultation, prescriptions, billing, and patient communication so the record supports the clinic day instead of becoming a separate task.",
    primaryUseCase:
      "Best for clinics that want patient history, clinical documentation, prescriptions, and operational context in one record.",
    fit: [
      "Patient summary and clinical history",
      "Prescription and medication history",
      "Documents, metrics, appointments, and invoices in context",
    ],
    sections: [
      {
        title: "Clinical context in one place",
        body: "Doctors can review patient history, recent visits, prescriptions, and follow-up context without jumping across paper files and chat threads.",
      },
      {
        title: "Patient portal alignment",
        body: "Patients can access relevant prescriptions, invoices, appointments, and profile information through a Docita-powered portal where enabled.",
      },
      {
        title: "Trust-first language",
        body: "Docita supports healthcare documentation and workflow. It does not replace clinical judgment or make unsupported outcome claims.",
      },
    ],
    relatedSlugs: [
      "digital-prescription-software",
      "clinic-management-software-india",
      "paper-to-cloud-clinic-software",
    ],
  },
];

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return seoLandingPages.find((page) => page.slug === slug);
}
