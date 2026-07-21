"use client";

import Image from "next/image";
import {
  Button,
  Card
} from "@workspace/ui/components";
import { useSignaturePad } from "./use-signature-pad";
import {
  SignaturePadCanvas,
  SignaturePadToolbar,
} from "./signature-pad-sections";

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function SignaturePad({
  onSave,
  onCancel,
  className,
}: SignatureCanvasProps) {
  const pad = useSignaturePad({ onSave });

  return (
    <div className={className}>
      <Card className="p-4">
        <div className="space-y-4">
          <SignaturePadCanvas
            containerRef={pad.containerRef}
            sigCanvasRef={pad.sigCanvasRef}
            canvasWidth={pad.canvasWidth}
            onStrokeBegin={pad.onStrokeBegin}
            onStrokeEnd={pad.onStrokeEnd}
          />
          <SignaturePadToolbar
            isEmpty={pad.isEmpty}
            canUndo={pad.canUndo}
            canRedo={pad.canRedo}
            onUndo={pad.undo}
            onRedo={pad.redo}
            onClear={pad.clear}
            onCancel={onCancel}
            onSave={pad.save}
          />
        </div>
      </Card>
    </div>
  );
}

interface SignaturePreviewProps {
  dataUrl: string;
  onEdit?: () => void;
  onRemove?: () => void;
}

export function SignaturePreview({
  dataUrl,
  onEdit,
  onRemove,
}: SignaturePreviewProps) {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Signature Preview
          </label>
          <div className="rounded-lg border bg-white p-4">
            <Image
              src={dataUrl}
              alt="Signature preview"
              width={500}
              height={200}
              className="max-w-full h-auto"
              unoptimized
            />
          </div>
        </div>

        {(onEdit || onRemove) && (
          <div className="flex gap-2 justify-end">
            {onEdit && (
              <Button type="button" variant="outline" onClick={onEdit}>
                Edit
              </Button>
            )}
            {onRemove && (
              <Button type="button" variant="destructive" onClick={onRemove}>
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
