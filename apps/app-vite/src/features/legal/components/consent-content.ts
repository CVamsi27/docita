import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";

export interface ConsentContent {
  title: string;
  description: string;
  purposes: { key: string; label: string; description: string }[];
  rights: string[];
  dpoContact: string;
  agreeButton: string;
  declineButton: string;
}

export const CONSENT_CONTENT: Record<string, ConsentContent> = {
  en: {
    title: "Data Privacy & Consent Notice",
    description: "Docita Hospital Management System collects and processes your personal data to provide medical management services. By clicking 'I Agree,' you consent to the following:",
    purposes: [
      { key: "medical_records", label: "Medical Records Management", description: "We collect your name, age, contact details, and medical history solely to facilitate doctor consultations and maintain your health records" },
      { key: "data_storage", label: "Data Storage", description: "Your data is stored on secure servers located within India (AWS Mumbai ap-south-1)" },
      { key: "data_sharing", label: "Data Sharing with Healthcare Providers", description: "We only share your data with the specific healthcare providers (doctors/clinics) you choose to engage with on this platform" },
      { key: "whatsapp_communication", label: "WhatsApp Communication (Optional)", description: "Receive appointment reminders, prescriptions, and invoices via WhatsApp" },
    ],
    rights: [
      "Access your personal data at any time",
      "Correct any inaccurate information",
      "Request deletion of your data (Right to Erasure)",
      "Export your data in a portable format",
      "Withdraw this consent via 'Privacy Settings' in your profile",
    ],
    dpoContact: `For grievances, contact our Data Protection Officer at ${SUPPORT_EMAIL}`,

    agreeButton: "I Agree",
    declineButton: "Decline",
  },
  hi: {
    title: "डेटा गोपनीयता और सहमति सूचना",
    description: "डॉसिटा अस्पताल प्रबंधन प्रणाली चिकित्सा प्रबंधन सेवाएं प्रदान करने के लिए आपके व्यक्तिगत डेटा को एकत्र और संसाधित करती है। 'मैं सहमत हूं' पर क्लिक करके, आप निम्नलिखित के लिए सहमति देते हैं:",
    purposes: [
      { key: "medical_records", label: "मेडिकल रिकॉर्ड प्रबंधन", description: "हम आपका नाम, आयु, संपर्क विवरण और चिकित्सा इतिहास केवल डॉक्टर परामर्श और आपके स्वास्थ्य रिकॉर्ड बनाए रखने के लिए एकत्र करते हैं।" },
      { key: "data_storage", label: "डेटा संग्रहण", description: "आपका डेटा भारत (AWS मुंबई) में स्थित सुरक्षित सर्वर पर संग्रहीत है।" },
      { key: "data_sharing", label: "स्वास्थ्य सेवा प्रदाताओं के साथ डेटा साझाकरण", description: "हम आपका डेटा केवल उन विशिष्ट स्वास्थ्य सेवा प्रदाताओं के साथ साझा करते हैं जिन्हें आप इस प्लेटफ़ॉर्म पर चुनते हैं।" },
      { key: "whatsapp_communication", label: "व्हाट्सएप संचार (वैकल्पिक)", description: "व्हाट्सएप के माध्यम से अपॉइंटमेंट रिमाइंडर, प्रिस्क्रिप्शन और इनवॉइस प्राप्त करें।" },
    ],
    rights: [
      "किसी भी समय अपने व्यक्तिगत डेटा तक पहुंचें",
      "किसी भी गलत जानकारी को सही करें",
      "अपने डेटा को हटाने का अनुरोध करें",
      "अपने डेटा को पोर्टेबल प्रारूप में निर्यात करें",
      "अपनी प्रोफ़ाइल में 'गोपनीयता सेटिंग्स' के माध्यम से इस सहमति को वापस लें",
    ],
    dpoContact: `शिकायतों के लिए, हमारे डेटा सुरक्षा अधिकारी से ${SUPPORT_EMAIL} पर संपर्क करें`,

    agreeButton: "मैं सहमत हूं",
    declineButton: "अस्वीकार करें",
  },
};
