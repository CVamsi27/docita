import { redirect } from "next/navigation";

/**
 * `/dashboard` was retired in favour of `/today` as the canonical morning
 * landing surface (UI/UX Standard 2026 §1.1). Bookmarks and palette URLs are
 * preserved via this redirect.
 */
export default function DashboardRedirectPage() {
  redirect("/today");
}
