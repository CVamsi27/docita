export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function TemplatesPage() {
  redirect("/settings?tab=prescriptions");
}
