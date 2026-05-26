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
import { DataState } from "@workspace/ui/components/data-state";
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
import { Feature } from "@workspace/types";
import { api } from "@/lib/api/api-client";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { logger } from "@/lib/monitoring/logger";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useMobileUpload } from "@/features/ocr";

interface MedicalDocument {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
  signedAt?: string;
  validFrom?: string;
  validUntil?: string;
  pdfUrl?: string | null;
}

interface Props {
  patientId: string;
}

export function MedicalDocumentList({ patientId }: Props) {
  const list = useMedicalDocumentList(patientId);

  if (list.loading) {
    return (
      <DataState status="loading" loadingMessage="Loading documents…" />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Medical documents</h3>
        <Button size="sm" variant="outline" onClick={() => list.setShowNew(true)}>
          <Plus className="h-3 w-3 mr-1" />
          New
        </Button>
      </div>

      <MedicalDocumentCreateDialog
        open={list.showNew}
        onOpenChange={list.setShowNew}
        newType={list.newType}
        setNewType={list.setNewType}
        newTitle={list.newTitle}
        setNewTitle={list.setNewTitle}
        newFile={list.newFile}
        newFileUrl={list.newFileUrl}
        showQr={list.showQr}
        setShowQr={list.setShowQr}
        qrUrl={list.qrUrl}
        creating={list.creating}
        onCreate={() => void list.handleCreate()}
        onFileChange={list.handleFileChange}
        onMobileUpload={list.handleMobileUpload}
      />

      {list.documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet</p>
      ) : (
        list.documents.map((doc) => (
          <MedicalDocumentCard
            key={doc.id}
            doc={doc}
            onSign={(id) => void list.handleSign(id)}
            onRevoke={(id) => void list.handleRevoke(id)}
          />
        ))
      )}
    </div>
  );
}
