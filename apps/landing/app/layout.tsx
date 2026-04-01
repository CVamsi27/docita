import "./globals.css";
import { Providers } from "./providers";
import { DOCITA_ICON_CACHE_BUST } from "@workspace/ui/lib/docita-brand";

export const metadata = {
  metadataBase: new URL("https://docita.work"),
  icons: {
    icon: `/branding/Round_Logo.png?${DOCITA_ICON_CACHE_BUST}`,
    apple: `/branding/Round_Logo.png?${DOCITA_ICON_CACHE_BUST}`,
  },
  title: {
    default: "Docita - Clinic Management Software | 14-Day Free Trial",
    template: "%s | Docita",
  },
  description:
    "Docita is the all-in-one clinic management platform for Indian doctors. Manage appointments, digital prescriptions, billing, patient records, and WhatsApp communication — free 14-day trial, no credit card required.",
  keywords: [
    "clinic management software India",
    "hospital management system",
    "practice management software",
    "doctor appointment scheduling",
    "digital prescription software",
    "patient records management",
    "EMR software India",
    "EHR India",
    "medical billing software",
    "healthcare software India",
    "clinic software for doctors",
    "ICD-10 coding software",
    "WhatsApp patient communication",
    "AI medical assistant",
    "telemedicine software India",
    "multi-specialty clinic software",
    "Docita",
    "free clinic management software",
  ],
  authors: [{ name: "Docita" }],
  creator: "Docita",
  publisher: "Docita",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://docita.work",
    siteName: "Docita",
    title: "Docita - Clinic Management Software | 14-Day Free Trial",
    description:
      "The complete operating system for modern Indian clinics. Appointments, digital prescriptions, billing, analytics, and AI assistance — all in one place. Start free for 14 days.",
    images: [
      {
        url: `/branding/Dark-background.png?${DOCITA_ICON_CACHE_BUST}`,
        width: 1024,
        height: 1024,
        alt: "Docita Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Docita - Clinic Management Software | 14-Day Free Trial",
    description:
      "The complete operating system for modern Indian clinics. Start your free 14-day trial today — no credit card required.",
    images: [`/branding/Dark-background.png?${DOCITA_ICON_CACHE_BUST}`],
  },
  alternates: {
    canonical: "https://docita.work",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Docita",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  url: "https://docita.work",
  description:
    "All-in-one clinic management software for Indian healthcare providers. Manage patients, appointments, prescriptions, billing, and more.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "14-day free trial, no credit card required",
  },
  creator: {
    "@type": "Organization",
    name: "Docita",
    url: "https://docita.work",
    email: "support@docita.work",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      addressCountry: "IN",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
