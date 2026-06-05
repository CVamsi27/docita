"use client";

import { Button } from "@workspace/ui/components/form/button";
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
import {
  MEDICAL_DOCUMENT_TYPE_LABELS,
  MEDICAL_DOCUMENT_TYPE_OPTIONS,
} from "./medical-document-list-config";

export function MedicalDocumentCreateDialog({
  open,
  onOpenChange,
  newType,
  setNewType,
  newTitle,
  setNewTitle,
  newFile,
  newFileUrl,
  showQr,
  setShowQr,
  qrUrl,
  creating,
  onCreate,
  onFileChange,
  onMobileUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newType: string;
  setNewType: (value: string) => void;
  newTitle: string;
  setNewTitle: (value: string) => void;
  newFile: File | null;
  newFileUrl: string | null;
  showQr: boolean;
  setShowQr: (value: boolean) => void;
  qrUrl: string | null;
  creating: boolean;
  onCreate: () => void;
  onFileChange: (file: File | null) => void;
  onMobileUpload: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                {MEDICAL_DOCUMENT_TYPE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {MEDICAL_DOCUMENT_TYPE_LABELS[value]}
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
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onMobileUpload}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
