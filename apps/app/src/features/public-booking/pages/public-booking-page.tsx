import { useParams } from "react-router";
import { PublicBookingPage } from "@/features/public-booking/public-booking-page";

export function PublicBookingPageRoute() {
  const { referralCode } = useParams<{ referralCode: string }>();
  if (!referralCode) {
    return null;
  }
  return <PublicBookingPage referralCode={referralCode} />;
}
