import type { Metadata } from "next";
import { PublicBookingPage } from "@/features/public-booking/public-booking-page";

const BOOK_META_DESCRIPTION =
  "Submit a visit request to your care team through a secure Docita booking link. Staff confirm before your appointment is final.";

export const metadata: Metadata = {
  title: "Request a visit",
  description: BOOK_META_DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: {
    title: "Request a visit",
    description: BOOK_META_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Request a visit",
    description: BOOK_META_DESCRIPTION,
  },
};

interface BookPageProps {
  params: Promise<{ referralCode: string }>;
}

export default async function PublicBookPage({ params }: BookPageProps) {
  const { referralCode } = await params;
  return <PublicBookingPage referralCode={referralCode} />;
}
