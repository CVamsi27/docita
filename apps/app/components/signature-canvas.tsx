'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@workspace/ui/components/button';
import { Card } from '@workspace/ui/components/card';
import { Check, Eraser, Redo2, Trash2, Undo2 } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function SignaturePad({ onSave, onCancel, className }: SignatureCanvasProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(400);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const CANVAS_HEIGHT = 180;
  const MAX_HISTORY = 30;

  const resizeCanvas = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width > 0 && width !== canvasWidth) {
      // Preserve signature data across resize
      const dataUrl = sigCanvas.current?.isEmpty()
        ? null
        : sigCanvas.current?.toDataURL();
      setCanvasWidth(width);
      if (dataUrl) {
        requestAnimationFrame(() => {
          sigCanvas.current?.fromDataURL(dataUrl);
        });
      }
    }
  }, [canvasWidth]);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleStrokeEnd = useCallback(() => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    const snapshot = sigCanvas.current.toDataURL();
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, snapshot].slice(-MAX_HISTORY);
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex <= 0) {
      sigCanvas.current?.clear();
      setIsEmpty(true);
      setHistoryIndex(-1);
      return;
    }
    const prevIndex = historyIndex - 1;
    const snapshot = history[prevIndex];
    sigCanvas.current?.clear();
    if (snapshot) {
      sigCanvas.current?.fromDataURL(snapshot);
    }
    setHistoryIndex(prevIndex);
    setIsEmpty(false);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const snapshot = history[nextIndex];
    sigCanvas.current?.clear();
    if (snapshot) {
      sigCanvas.current?.fromDataURL(snapshot);
    }
    setHistoryIndex(nextIndex);
    setIsEmpty(false);
  };

  const save = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    const dataUrl = sigCanvas.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className={className}>
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Draw your signature below
            </label>
            <div
              ref={containerRef}
              className="overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background"
              style={{ touchAction: 'none' }}
            >
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  width: canvasWidth,
                  height: CANVAS_HEIGHT,
                  className: 'block w-full',
                  style: { touchAction: 'none' },
                }}
                penColor="black"
                minWidth={0.8}
                maxWidth={3}
                velocityFilterWeight={0.7}
                onBegin={() => setIsEmpty(false)}
                onEnd={handleStrokeEnd}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use your mouse or touch to draw your signature
            </p>
          </div>

          <div className="flex gap-2 justify-end flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex < 0}
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clear}
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
            <Button type="button" onClick={save} disabled={isEmpty}>
              <Check className="h-4 w-4 mr-2" />
              Save Signature
            </Button>
          </div>
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

export function SignaturePreview({ dataUrl, onEdit, onRemove }: SignaturePreviewProps) {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Signature Preview</label>
          <div className="rounded-lg border bg-background p-4">
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
