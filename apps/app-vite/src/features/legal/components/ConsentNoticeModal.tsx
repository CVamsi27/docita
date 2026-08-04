import { useState } from "react";
import { Shield } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from "@workspace/ui/components";
import { CONSENT_CONTENT } from "./consent-content";
import {
  ConsentLanguageSelector,
  ConsentPurposeList,
  ConsentRightsList,
  DataProtectionContact,
} from "./ConsentNoticeModalSections";

export interface ConsentNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: (consents: Record<string, boolean>) => void;
  onDecline?: () => void;
}

export function ConsentNoticeModal({
  open,
  onOpenChange,
  onConsent,
  onDecline,
}: ConsentNoticeModalProps) {
  const [language, setLanguage] = useState("en");
  const [consents, setConsents] = useState<Record<string, boolean>>({
    medical_records: false,
    data_storage: false,
    data_sharing: false,
    whatsapp_communication: false,
  });

  const content = CONSENT_CONTENT[language] || CONSENT_CONTENT.en;
  const requiredConsents = ["medical_records", "data_storage", "data_sharing"];
  const allRequiredAccepted = requiredConsents.every((key) => consents[key]);

  const handleConsentChange = (key: string, checked: boolean) => {
    setConsents((prev) => ({ ...prev, [key]: checked }));
  };

  const handleAgree = () => {
    if (allRequiredAccepted) {
      onConsent(consents);
      onOpenChange(false);
    }
  };

  const handleDecline = () => {
    onDecline?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border/70 bg-background/70 p-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{content.title}</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Digital Personal Data Protection Act, 2023
              </DialogDescription>
            </div>
            <ConsentLanguageSelector
              language={language}
              onLanguageChange={setLanguage}
            />
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <p className="text-muted-foreground">{content.description}</p>
            <ConsentPurposeList
              purposes={content.purposes}
              consents={consents}
              onConsentChange={handleConsentChange}
            />
            <ConsentRightsList rights={content.rights} />
            <DataProtectionContact dpoContact={content.dpoContact} />
            <p className="text-xs text-muted-foreground">
              * Required fields. WhatsApp communication is optional.
            </p>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={handleDecline}>
            {content.declineButton}
          </Button>
          <Button onClick={handleAgree} disabled={!allRequiredAccepted}>
            {content.agreeButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
