export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function DeskFloorPage() {
  redirect("/desk/collect-payment");
}
