import { PublicBookingPage } from "@/features/public-booking/public-booking-page";

interface BookPageProps {
  params: Promise<{ referralCode: string }>;
}

export default async function PublicBookPage({ params }: BookPageProps) {
  const { referralCode } = await params;
  return <PublicBookingPage referralCode={referralCode} />;
}
