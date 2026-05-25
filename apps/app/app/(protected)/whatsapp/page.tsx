import { redirect } from "next/navigation";

type WhatsappPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WhatsappPage({
  searchParams,
}: WhatsappPageProps) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams({ tab: "notifications" });
  const patientId = resolvedParams?.patientId;

  if (typeof patientId === "string" && patientId.trim()) {
    params.set("patientId", patientId);
  }

  redirect(`/inbox?${params.toString()}`);
}
