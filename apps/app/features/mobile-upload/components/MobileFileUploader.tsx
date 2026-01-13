
import React, { useCallback, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@workspace/ui/components/card";
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
    <Card className="overflow-hidden shadow-sm border-slate-200 dark:border-slate-800">
      <CardContent className="p-0">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative transition-all duration-200 ${
            dragActive
              ? "bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-inset"
              : "bg-slate-50 dark:bg-slate-900/50"
          }`}
        >
          {previewUrl ? (
            /* Preview Mode */
            <div className="relative aspect-4/3">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-contain bg-black/5 dark:bg-white/5"
              />
              {/* Clear Button */}
              <button
                onClick={clearFile}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors shadow-lg"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Retake hint */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2">
                  <RotateCcw className="h-3 w-3" />
                  <span>Tap ✕ to select a different image</span>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Mode */
            <label className="block cursor-pointer">
              <div className="aspect-4/3 flex flex-col items-center justify-center p-6 space-y-4">
                <div
                  className={`p-4 rounded-2xl transition-colors ${
                    dragActive
                      ? "bg-blue-100 dark:bg-blue-900/50"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <Camera
                    className={`h-10 w-10 transition-colors ${
                      dragActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500"
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
                {/* File format hint */}
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
