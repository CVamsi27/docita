import { Globe, Mail } from "lucide-react";
import { Checkbox, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
] as const;

export function ConsentLanguageSelector({
  language,
  onLanguageChange,
}: {
  language: string;
  onLanguageChange: (language: string) => void;
}) {
  return (
    <Select value={language} onValueChange={onLanguageChange}>
      <SelectTrigger className="w-40">
        <Globe className="h-4 w-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ConsentPurposeList({
  purposes,
  consents,
  onConsentChange,
}: {
  purposes: { key: string; label: string; description: string }[];
  consents: Record<string, boolean>;
  onConsentChange: (key: string, checked: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Purpose of Data Collection</h4>
      {purposes.map((purpose) => (
        <div key={purpose.key} className="flex items-start space-x-3 p-3 border border-border/70 rounded-[var(--radius)]">
          <Checkbox id={purpose.key} checked={consents[purpose.key]} onCheckedChange={(checked) => onConsentChange(purpose.key, checked === true)} />
          <div className="space-y-1">
            <Label htmlFor={purpose.key} className="font-medium cursor-pointer">
              {purpose.label}
              {purpose.key !== "whatsapp_communication" && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            <p className="text-sm text-muted-foreground">{purpose.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConsentRightsList({ rights }: { rights: string[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Your rights</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {rights.map((right, index) => (
          <li key={index} className="flex items-start gap-2"><span className="text-primary">•</span>{right}</li>
        ))}
      </ul>
    </div>
  );
}

export function DataProtectionContact({ dpoContact }: { dpoContact: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <Mail className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{dpoContact}</p>
    </div>
  );
}
