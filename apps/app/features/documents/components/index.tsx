"use client";

import { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
  FileText,
  Upload,
  Search,
  Eye,
  Download,
  Trash2,
  Image,
  File,
} from "lucide-react";

// Document List Component
export const DocumentList: FC<{
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    uploadedAt: string;
    mimeType: string;
  }>;
  onView?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
}> = ({ documents = [], onView, onDownload, onDelete }) => {
  const getIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Documents</CardTitle>
          </div>
          <Badge variant="outline">{documents.length} files</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No documents uploaded yet
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const Icon = getIcon(doc.mimeType);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-[200px]">
                        {doc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type} • {doc.size} • {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView?.(doc.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload?.(doc.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete?.(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Document Upload Component
export const DocumentUpload: FC<{
  onUpload?: (files: FileList) => void;
}> = ({ onUpload }) => {
  const [dragOver, setDragOver] = useState(false);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>Drag & drop or click to upload</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onUpload?.(e.dataTransfer.files);
          }}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, images, or documents up to 10MB
          </p>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && onUpload?.(e.target.files)}
          />
          <Button variant="outline" className="mt-4">
            Browse Files
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
