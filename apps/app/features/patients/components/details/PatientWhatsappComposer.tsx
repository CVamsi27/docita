"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useClinicWhatsappTemplates, usePatientWhatsappSentMessages, useSendCustomWhatsAppMessage } from "@workspace/data-access";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { WhatsappComposerForm, SentMessageHistory } from "./PatientWhatsappComposerSections";

const NO_TEMPLATE = "__none__";

interface PatientWhatsappComposerProps {
  patientId: string;
  patientName: string;
  phoneNumber?: string | null;
}

export function PatientWhatsappComposer({
  patientId,
  patientName,
  phoneNumber,
}: PatientWhatsappComposerProps) {
  const trimmedPhone = phoneNumber?.trim() ?? "";
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(NO_TEMPLATE);

  const templatesQuery = useClinicWhatsappTemplates();
  const historyQuery = usePatientWhatsappSentMessages(patientId);
  const sendMessage = useSendCustomWhatsAppMessage();

  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((t) => t.isActive),
    [templatesQuery.data],
  );

  const handleSelectTemplate = (value: string) => {
    setSelectedTemplateId(value);
    if (value === NO_TEMPLATE) return;
    const template = templates.find((t) => t.id === value);
    if (template) {
      setMessage(template.content);
    }
  };

  const trimmedMessage = message.trim();
  const canSend =
    Boolean(trimmedPhone) &&
    trimmedMessage.length > 0 &&
    !sendMessage.isPending;

  const handleSend = async () => {
    if (!canSend) return;
    try {
      await sendMessage.mutateAsync({
        text: trimmedMessage,
        patientId,
      });
      toast.success(`Message sent to ${patientName}`);
      setMessage("");
      setSelectedTemplateId(NO_TEMPLATE);
      void historyQuery.refetch();
    } catch (error) {
      showUserFacingErrorToast(
        getUserFacingErrorMessage(error, {
          fallback:
            "We could not send this message. WhatsApp only delivers free-text messages within 24 hours of the patient's last reply.",
          context: "upload",
        }),
      );
    }
  };

  if (!trimmedPhone) {
    return (
      <div data-testid="patient-communication-tab">
        <DataState
          status="empty"
          emptyIcon={MessageCircle}
          emptyTitle="No phone number on file"
          emptyDescription="Add a phone number to this patient's profile to send WhatsApp messages."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="patient-communication-tab">
      <WhatsappComposerForm
        patientName={patientName}
        message={message}
        onMessageChange={setMessage}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={handleSelectTemplate}
        templates={templates}
        templatesLoading={templatesQuery.isLoading}
        canSend={canSend}
        isPending={sendMessage.isPending}
        onSend={handleSend}
      />

      <SentMessageHistory
        messages={historyQuery.data ?? []}
        isLoading={historyQuery.isLoading}
        isError={historyQuery.isError}
        onRetry={() => void historyQuery.refetch()}
      />
    </div>
  );
}
