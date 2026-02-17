export type AppLocale = "en" | "hi";

export type TranslationKey =
  | "language"
  | "welcomeDocita"
  | "welcomeBack"
  | "createAccount"
  | "enterEmail"
  | "signInWorkspace"
  | "getStarted"
  | "continue"
  | "signIn"
  | "patientPortal"
  | "overview"
  | "appointments"
  | "prescriptions"
  | "billing"
  | "dashboard"
  | "patients"
  | "consultation"
  | "labTests"
  | "invoices"
  | "inventory"
  | "documents"
  | "analytics"
  | "codingQueue"
  | "settings"
  | "bedManagement"
  | "plan"
  | "upgrade"
  | "loading"
  | "offlineBanner";

export const DEFAULT_LOCALE: AppLocale = "en";

export const LOCALE_STORAGE_KEY = "docita_locale";

const translations: Record<AppLocale, Record<TranslationKey, string>> = {
  en: {
    language: "Language",
    welcomeDocita: "Welcome to Docita",
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    enterEmail: "Enter your email to continue",
    signInWorkspace: "Sign in to your workspace",
    getStarted: "Get started with Docita",
    continue: "Continue",
    signIn: "Sign In",
    patientPortal: "Docita Patient Portal",
    overview: "Overview",
    appointments: "Appointments",
    prescriptions: "Prescriptions",
    billing: "Billing",
    dashboard: "Dashboard",
    patients: "Patients",
    consultation: "Consultation",
    labTests: "Lab Tests",
    invoices: "Invoices",
    inventory: "Inventory",
    documents: "Documents",
    analytics: "Analytics",
    codingQueue: "Coding Queue",
    settings: "Settings",
    bedManagement: "Bed Management",
    plan: "Plan",
    upgrade: "Upgrade",
    loading: "Loading...",
    offlineBanner:
      "You are offline. Viewing cached pages is available, but API-backed actions will resume after reconnection.",
  },
  hi: {
    language: "भाषा",
    welcomeDocita: "डॉसिटा में आपका स्वागत है",
    welcomeBack: "वापसी पर स्वागत है",
    createAccount: "अपना खाता बनाएं",
    enterEmail: "जारी रखने के लिए अपना ईमेल दर्ज करें",
    signInWorkspace: "अपने कार्यक्षेत्र में साइन इन करें",
    getStarted: "डॉसिटा के साथ शुरुआत करें",
    continue: "जारी रखें",
    signIn: "साइन इन",
    patientPortal: "डॉसिटा पेशेंट पोर्टल",
    overview: "ओवरव्यू",
    appointments: "अपॉइंटमेंट्स",
    prescriptions: "प्रिस्क्रिप्शन्स",
    billing: "बिलिंग",
    dashboard: "डैशबोर्ड",
    patients: "मरीज",
    consultation: "परामर्श",
    labTests: "लैब टेस्ट",
    invoices: "इनवॉइस",
    inventory: "इन्वेंटरी",
    documents: "दस्तावेज़",
    analytics: "एनालिटिक्स",
    codingQueue: "कोडिंग क्यू",
    settings: "सेटिंग्स",
    bedManagement: "बेड मैनेजमेंट",
    plan: "प्लान",
    upgrade: "अपग्रेड",
    loading: "लोड हो रहा है...",
    offlineBanner:
      "आप ऑफलाइन हैं। कैश किए गए पेज देखे जा सकते हैं, लेकिन API आधारित क्रियाएँ कनेक्शन लौटने के बाद फिर शुरू होंगी।",
  },
};

export function getTranslation(locale: AppLocale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations[DEFAULT_LOCALE][key];
}
