import React, { useCallback, useState } from "react";
import Image from "next/image";
import { Card, CardContent, SymbolTooltip } from "@workspace/ui/components";
import { Camera, ImageIcon, RotateCcw, X } from "lucide-react";

interface MobileFileUploaderProps {
  onFileSelect: (file: File | null, previewUrl: string | null) => void;
  previewUrl: string | null;
}

export function MobileFileUploader({
  onFileSelect,
  previewUrl,
}: MobileFileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0];
        onFileSelect(selectedFile, URL.createObjectURL(selectedFile));
      }
    },
    [onFileSelect],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        onFileSelect(droppedFile, URL.createObjectURL(droppedFile));
      }
    },
    [onFileSelect],
  );

  const clearFile = useCallback(() => {
    onFileSelect(null, null);
  }, [onFileSelect]);

  return (
    <Card className="overflow-hidden shadow-sm border-border">
      <CardContent className="p-0">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative transition-colors duration-200 ${
            dragActive
              ? "surface-info ring-2 ring-info ring-inset"
              : "bg-muted/40"
          }`}
        >
          {previewUrl ? (
            <div className="relative aspect-4/3">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-contain bg-black/5 dark:bg-black/10"
              />
              <SymbolTooltip label="Remove image">
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors shadow-lg"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </SymbolTooltip>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2">
                  <RotateCcw className="h-3 w-3" />
                  <span>Tap X to select a different image</span>
                </div>
              </div>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="aspect-4/3 flex flex-col items-center justify-center p-6 space-y-4">
                <div
                  className={`p-4 rounded-lg transition-colors ${
                    dragActive ? "surface-info" : "bg-muted"
                  }`}
                >
                  <Camera
                    className={`h-10 w-10 transition-colors ${
                      dragActive ? "text-info" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium text-foreground">
                    {dragActive ? "Drop your image here" : "Tap to capture"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or select from gallery
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  <span>JPG, PNG supported</span>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
