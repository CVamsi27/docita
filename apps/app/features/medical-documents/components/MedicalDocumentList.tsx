"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { FileText, Plus, Check, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface MedicalDocument {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  signedAt?: string;
  validFrom?: string;
  validUntil?: string;
}

interface Props {
  patientId: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  SIGNED: "default",
  REVOKED: "destructive",
};

const TYPE_LABELS: Record<string, string> = {
  MEDICAL_CERTIFICATE: "Medical Certificate",
  FITNESS_CERTIFICATE: "Fitness Certificate",
  DISCHARGE_SUMMARY: "Discharge Summary",
  REFERRAL_LETTER: "Referral Letter",
  SICK_NOTE: "Sick Note",
};

export function MedicalDocumentList({ patientId }: Props) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState("MEDICAL_CERTIFICATE");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<MedicalDocument[]>(
        `/medical-documents?patientId=${patientId}`,
      );
      setDocuments(data);
    } catch (err) {
      logger.error("Failed to load medical documents", { err });
      showUserFacingErrorToast("We could not load medical documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSign = async (id: string) => {
    try {
      await api.patch(`/medical-documents/${id}/sign`, {});
      toast.success("Document signed");
      await load();
    } catch (err) {
      logger.error("Failed to sign document", { err });
      showUserFacingErrorToast("We could not sign document. Please try again.");
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.patch(`/medical-documents/${id}/revoke`, {});
      toast.success("Document revoked");
      await load();
    } catch (err) {
      logger.error("Failed to revoke document", { err });
      showUserFacingErrorToast("We could not revoke document. Please try again.");
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      showUserFacingErrorToast("Please enter a title");
      return;
    }
    setCreating(true);
    try {
      await api.post("/medical-documents", {
        type: newType,
        patientId,
        title: newTitle.trim(),
        content: {},
        doctorId: user?.id ?? "",
      });
      toast.success("Document created");
      setShowNew(false);
      setNewTitle("");
      setNewType("MEDICAL_CERTIFICATE");
      await load();
    } catch (err) {
      logger.error("Failed to create document", { err });
      showUserFacingErrorToast("We could not create document. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Loading documents...
      </div>
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
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Document title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
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
                      {TYPE_LABELS[doc.type] || doc.type}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_COLORS[doc.status] as "default" | "secondary" | "destructive" | "outline"}>
                  {doc.status}
                </Badge>
              </div>
            </CardHeader>
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
