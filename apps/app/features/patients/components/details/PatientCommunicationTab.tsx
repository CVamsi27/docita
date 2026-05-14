"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";

interface PatientCommunicationTabProps {
  patientId: string;
}

export function PatientCommunicationTab({
  patientId,
}: PatientCommunicationTabProps) {
  const whatsappHref = `/inbox?tab=notifications&patientId=${encodeURIComponent(patientId)}`;

  return (
    <div data-testid="patient-communication-tab">
      <DataState
        status="empty"
        emptyIcon={MessageCircle}
        emptyTitle="No patient messages yet"
        emptyDescription="WhatsApp replies and message follow-up for this patient will appear in the communication workspace."
      />
      <div className="-mt-6 flex justify-center">
        <Button asChild>
          <Link href={whatsappHref}>Open WhatsApp</Link>
        </Button>
      </div>
    </div>
  );
}
