"use client";

import type { RefObject } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Button,
  SymbolTooltip
} from "@workspace/ui/components";
import { Check, Eraser, Redo2, Trash2, Undo2 } from "lucide-react";
import { SIGNATURE_CANVAS_HEIGHT } from "./use-signature-pad";

interface SignaturePadCanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
  sigCanvasRef: RefObject<SignatureCanvas | null>;
  canvasWidth: number;
  onStrokeBegin: () => void;
  onStrokeEnd: () => void;
}

/** The drawing surface — the resize-tracked container plus the underlying `react-signature-canvas`, split out as its own self-contained piece independent of the toolbar beside it. */
export function SignaturePadCanvas({
  containerRef,
  sigCanvasRef,
  canvasWidth,
  onStrokeBegin,
  onStrokeEnd,
}: SignaturePadCanvasProps) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">
        Draw your signature below
      </label>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-white"
        style={{ touchAction: "none" }}
      >
        <SignatureCanvas
          ref={sigCanvasRef}
          canvasProps={{
            width: canvasWidth,
            height: SIGNATURE_CANVAS_HEIGHT,
            className: "block w-full",
            style: { touchAction: "none" },
          }}
          penColor="black"
          minWidth={0.8}
          maxWidth={3}
          velocityFilterWeight={0.7}
          onBegin={onStrokeBegin}
          onEnd={onStrokeEnd}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Use your mouse or touch to draw your signature
      </p>
    </div>
  );
}

interface SignaturePadToolbarProps {
  isEmpty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCancel?: () => void;
  onSave: () => void;
}

/** The undo/redo/clear/cancel/save action row — split out as its own self-contained toolbar independent of the drawing surface above it. */
export function SignaturePadToolbar({
  isEmpty,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onCancel,
  onSave,
}: SignaturePadToolbarProps) {
  return (
    <div className="flex gap-2 justify-end flex-wrap">
      <SymbolTooltip label="Undo">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
      <SymbolTooltip label="Redo">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
      <Button
        type="button"
        variant="outline"
        onClick={onClear}
        disabled={isEmpty}
      >
        <Eraser className="h-4 w-4 mr-2" />
        Clear
      </Button>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          <Trash2 className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      )}
      <Button type="button" onClick={onSave} disabled={isEmpty}>
        <Check className="h-4 w-4 mr-2" />
        Save Signature
      </Button>
    </div>
  );
}
