"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { FileText, Plus, Check, X } from "lucide-react";
import { Feature } from "@workspace/types";
import { api } from "@/lib/api/api-client";
import {
  useCreateMedicalDocument,
  useMedicalDocuments,
  useRevokeMedicalDocument,
  useSignMedicalDocument,
} from "@/hooks/api/use-clinical";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { logger } from "@/lib/monitoring/logger";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useMobileUpload } from "@/features/ocr";

interface Props {
  patientId: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  SIGNED: "default",
  REVOKED: "destructive",
};

const DOCUMENT_TYPE_OPTIONS = [
  "MEDICAL_CERTIFICATE",
  "FITNESS_CERTIFICATE",
  "DISCHARGE_SUMMARY",
  "REFERRAL_LETTER",
  "SICK_NOTE",
  "OTHER",
] as const;

const DOCUMENT_TYPE_LABELS: Record<
  (typeof DOCUMENT_TYPE_OPTIONS)[number],
  string
> = {
  MEDICAL_CERTIFICATE: "Medical Certificate",
  FITNESS_CERTIFICATE: "Fitness Certificate",
  DISCHARGE_SUMMARY: "Discharge Summary",
  REFERRAL_LETTER: "Referral Letter",
  SICK_NOTE: "Sick Note",
  OTHER: "Other",
};

export function MedicalDocumentList({ patientId }: Props) {
  const { user } = useAuth();
  const docsOk = useTierFeatureEnabled(Feature.DOCUMENT_ARCHIVAL);
  const {
    data: documents = [],
    isLoading: loading,
  } = useMedicalDocuments(patientId);
  const signDocument = useSignMedicalDocument();
  const revokeDocument = useRevokeMedicalDocument();
  const createDocument = useCreateMedicalDocument();

  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState("MEDICAL_CERTIFICATE");
  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileUrl, setNewFileUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { showQr, setShowQr, qrUrl, startMobileUpload } = useMobileUpload();

  const handleSign = async (id: string) => {
    if (!docsOk) return;
    try {
      await signDocument.mutateAsync(id);
      toast.success("Document signed");
    } catch (err) {
      logger.error("Failed to sign document", { err });
      showUserFacingErrorToast(
        "We could not sign this document. Please try again.",
      );
    }
  };

  const handleRevoke = async (id: string) => {
    if (!docsOk) return;
    try {
      await revokeDocument.mutateAsync(id);
      toast.success("Document revoked");
    } catch (err) {
      logger.error("Failed to revoke document", { err });
      showUserFacingErrorToast(
        "We could not revoke this document. Please try again.",
      );
    }
  };

  const handleCreate = async () => {
    if (!docsOk) return;
    if (!newTitle.trim()) {
      showUserFacingErrorToast("Enter a document title before creating it");
      return;
    }
    setCreating(true);
    try {
      let pdfUrl: string | undefined;
      if (newFile) {
        const session = await api.post<{ id: string; uploadSecret: string }>(
          `/uploads/session`,
          {},
        );
        const formData = new FormData();
        formData.append("file", newFile);
        const uploaded = await api.post<{ fileUrl?: string | null }>(
          `/uploads/session/${session.id}`,
          formData,
          {
            headers: {
              "X-Upload-Secret": session.uploadSecret,
            },
          },
        );
        pdfUrl = uploaded?.fileUrl ?? undefined;
      }

      await createDocument.mutateAsync({
        type: newType,
        patientId,
        title: newTitle.trim(),
        content: {},
        doctorId: user?.id ?? "",
        ...(pdfUrl ? { pdfUrl } : {}),
      });
      toast.success("Document created");
      setShowNew(false);
      setNewTitle("");
      setNewType("MEDICAL_CERTIFICATE");
      setNewFile(null);
      setNewFileUrl(null);
    } catch (err) {
      logger.error("Failed to create document", { err });
      showUserFacingErrorToast(
        "We could not create this document. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <DataState status="loading" loadingMessage="Loading documents…" />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Medical Documents</h3>
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
          <Plus className="h-3 w-3 mr-1" />
          New
        </Button>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Medical Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DOCUMENT_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">Upload document</Label>
                <span className="text-xs text-muted-foreground">
                  Optional, but recommended
                </span>
              </div>
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setNewFile(file);
                  setNewFileUrl(file ? URL.createObjectURL(file) : null);
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    void startMobileUpload((file) => {
                      setNewFile(file);
                      setNewFileUrl(URL.createObjectURL(file));
                    });
                  }}
                >
                  Upload from phone
                </Button>
                {newFile ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {newFile.name}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    PDF, PNG, JPG, or WebP
                  </p>
                )}
              </div>
              {showQr && qrUrl ? (
                <div className="rounded-md border bg-muted/20 p-2">
                  <p className="text-xs text-muted-foreground">
                    Scan this QR code on your phone to upload.
                  </p>
                  <p className="text-xs font-mono break-all mt-1">{qrUrl}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs mt-1"
                    onClick={() => setShowQr(false)}
                  >
                    Hide
                  </Button>
                </div>
              ) : null}
              {newFileUrl ? (
                <p className="text-xs text-muted-foreground">File selected.</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet</p>
      ) : (
        documents.map((doc) => (
          <Card key={doc.id} className="shadow-none">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-sm">{doc.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPE_LABELS[
                        doc.type as keyof typeof DOCUMENT_TYPE_LABELS
                      ] || doc.type}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    STATUS_COLORS[doc.status] as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                  }
                >
                  {doc.status}
                </Badge>
              </div>
            </CardHeader>
            {doc.pdfUrl ? (
              <CardContent className="py-0 px-4 pb-3">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                >
                  <a href={doc.pdfUrl} target="_blank" rel="noreferrer">
                    View uploaded file
                  </a>
                </Button>
              </CardContent>
            ) : null}
            {doc.status === "DRAFT" && (
              <CardContent className="py-2 px-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => handleSign(doc.id)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Sign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 text-destructive"
                  onClick={() => handleRevoke(doc.id)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Revoke
                </Button>
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
