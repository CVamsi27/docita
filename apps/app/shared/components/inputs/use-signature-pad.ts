"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type SignatureCanvas from "react-signature-canvas";

export const SIGNATURE_CANVAS_HEIGHT = 180;
const MAX_HISTORY = 30;

type CanvasRef = RefObject<SignatureCanvas | null>;

/**
 * Tracks the drawing surface's responsive width via `ResizeObserver` and
 * preserves the in-progress signature across resizes (the canvas element
 * clears its bitmap whenever its `width` attribute changes). Self-contained —
 * its only shared dependency is the canvas ref it reads/restores from.
 */
function useSignatureCanvasResize(sigCanvasRef: CanvasRef) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(400);

  const resizeCanvas = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width > 0 && width !== canvasWidth) {
      const dataUrl = sigCanvasRef.current?.isEmpty()
        ? null
        : sigCanvasRef.current?.toDataURL();
      setCanvasWidth(width);
      if (dataUrl) {
        requestAnimationFrame(() => {
          sigCanvasRef.current?.fromDataURL(dataUrl);
        });
      }
    }
  }, [canvasWidth, sigCanvasRef]);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  return { containerRef, canvasWidth };
}

/**
 * Owns the undo/redo history stack and the derived "is the canvas empty"
 * state — every stroke snapshot, clear, undo, and redo flows through here.
 * Self-contained — its only shared dependency is the canvas ref it
 * draws on/reads from.
 */
function useSignatureHistory(sigCanvasRef: CanvasRef) {
  const [isEmpty, setIsEmpty] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const clear = () => {
    sigCanvasRef.current?.clear();
    setIsEmpty(true);
    setHistory([]);
    setHistoryIndex(-1);
  };

  const onStrokeEnd = useCallback(() => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;
    const snapshot = sigCanvasRef.current.toDataURL();
    setHistory((prev) =>
      [...prev.slice(0, historyIndex + 1), snapshot].slice(-MAX_HISTORY),
    );
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex, sigCanvasRef]);

  const undo = () => {
    if (historyIndex <= 0) {
      sigCanvasRef.current?.clear();
      setIsEmpty(true);
      setHistoryIndex(-1);
      return;
    }
    const prevIndex = historyIndex - 1;
    const snapshot = history[prevIndex];
    sigCanvasRef.current?.clear();
    if (snapshot) sigCanvasRef.current?.fromDataURL(snapshot);
    setHistoryIndex(prevIndex);
    setIsEmpty(false);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const snapshot = history[nextIndex];
    sigCanvasRef.current?.clear();
    if (snapshot) sigCanvasRef.current?.fromDataURL(snapshot);
    setHistoryIndex(nextIndex);
    setIsEmpty(false);
  };

  return {
    isEmpty,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    onStrokeBegin: () => setIsEmpty(false),
    onStrokeEnd,
    clear,
    undo,
    redo,
  };
}

interface UseSignaturePadParams {
  onSave: (dataUrl: string) => void;
}

/**
 * Owns the signature pad's full drawing lifecycle by composing the two
 * independent concerns it bundles — responsive sizing and undo/redo history —
 * around the shared canvas ref, plus the save action. Extracted from
 * `SignaturePad` so the component's render wiring isn't carrying this much
 * state-and-effect bookkeeping alongside its layout.
 */
export function useSignaturePad({ onSave }: UseSignaturePadParams) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const { containerRef, canvasWidth } = useSignatureCanvasResize(sigCanvasRef);
  const history = useSignatureHistory(sigCanvasRef);

  const save = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;
    onSave(sigCanvasRef.current.toDataURL("image/png"));
  };

  return { sigCanvasRef, containerRef, canvasWidth, ...history, save };
}
