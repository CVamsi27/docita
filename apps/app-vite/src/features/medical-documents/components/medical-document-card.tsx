import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import { FileText, Check, X } from "lucide-react";
import { MEDICAL_DOCUMENT_STATUS_COLORS, medicalDocumentTypeLabel } from "./medical-document-list-config";

export function MedicalDocumentCard({
  doc, onSign, onRevoke,
}: {
  doc: { id: string; title: string; type: string; status: string; pdfUrl?: string | null };
  onSign: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  const { t } = useTranslation("MedicalDocuments");
  return (
    <Card className="shadow-none">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">{doc.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{medicalDocumentTypeLabel(doc.type)}</p>
            </div>
          </div>
          <Badge variant={(MEDICAL_DOCUMENT_STATUS_COLORS[doc.status] as "default" | "secondary" | "destructive" | "outline") || "outline"}>{doc.status}</Badge>
        </div>
      </CardHeader>
      {doc.pdfUrl ? (
        <CardContent className="py-0 px-4 pb-3">
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer">{t("card.viewUploadedFile")}</a>
          </Button>
        </CardContent>
      ) : null}
      {doc.status === "DRAFT" ? (
        <CardContent className="py-2 px-4 flex gap-2">
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onSign(doc.id)}>
            <Check className="h-3 w-3 mr-1" /> {t("card.signButton")}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => onRevoke(doc.id)}>
            <X className="h-3 w-3 mr-1" /> {t("card.revokeButton")}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
