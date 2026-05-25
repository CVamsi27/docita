"use client";

import { useEffect } from "react";
import type { LatLngExpression } from "leaflet";
import type { Map as LeafletMapInstance } from "leaflet";

export interface MapLifecycleOptions {
  open: boolean;
  shouldUseGoogle: boolean;
  googleMap: google.maps.Map | null;
  leafletMap: LeafletMapInstance | null;
  isMapViewportReady: boolean;
  isLeafletPainted: boolean;
  leafletRetryCount: number;
  centerExpression: LatLngExpression;
  mapZoom: number;
  mapViewportRef: React.RefObject<HTMLDivElement | null>;
  triggerGoogleResize: () => void;
  setMapLayoutVersion: React.Dispatch<React.SetStateAction<number>>;
  setMapInstanceKey: React.Dispatch<React.SetStateAction<number>>;
  setLeafletRetryCount: React.Dispatch<React.SetStateAction<number>>;
  setIsLeafletPainted: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Manages all map resize/sync/retry side-effects, keeping the dialog
 * orchestrator focused on rendering rather than map plumbing.
 */
export function useMapLifecycle({
  open,
  shouldUseGoogle,
  googleMap,
  leafletMap,
  isMapViewportReady,
  isLeafletPainted,
  leafletRetryCount,
  centerExpression,
  mapZoom,
  mapViewportRef,
  triggerGoogleResize,
  setMapLayoutVersion,
  setMapInstanceKey,
  setLeafletRetryCount,
  setIsLeafletPainted,
}: MapLifecycleOptions) {
  // ResizeObserver — bump layout version whenever the viewport resizes.
  useEffect(() => {
    if (!open) return;
    const node = mapViewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const bump = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setMapLayoutVersion((v) => v + 1);
      });
    };
    const observer = new ResizeObserver(bump);
    observer.observe(node);
    bump();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [open, mapViewportRef, setMapLayoutVersion]);

  // Google Maps — trigger resize after layout changes.
  useEffect(() => {
    if (!open || !shouldUseGoogle || !googleMap) return;
    const ids = [60, 220, 460].map((delay) =>
      window.setTimeout(() => triggerGoogleResize(), delay),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [googleMap, open, shouldUseGoogle, triggerGoogleResize]);

  // Leaflet — invalidate size + re-center after layout changes.
  useEffect(() => {
    if (!open || shouldUseGoogle || !leafletMap) return;
    const ids = [80, 220, 420, 700].map((delay) =>
      window.setTimeout(() => {
        try {
          const container = leafletMap.getContainer();
          if (!container?.isConnected) return;
          leafletMap.invalidateSize({ pan: false });
          leafletMap.setView(centerExpression, mapZoom, { animate: false });
        } catch {
          // Ignore stale-map races while dialog remounts.
        }
      }, delay),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [centerExpression, mapZoom, leafletMap, open, shouldUseGoogle]);

  // Leaflet — retry remounting if tiles have not painted yet.
  useEffect(() => {
    if (!open || shouldUseGoogle || !isMapViewportReady || isLeafletPainted) {
      return;
    }
    if (leafletRetryCount >= 2) return;
    const id = window.setTimeout(() => {
      setLeafletRetryCount((c) => c + 1);
      setIsLeafletPainted(false);
      setMapInstanceKey((v) => v + 1);
      setMapLayoutVersion((v) => v + 1);
    }, 900);
    return () => window.clearTimeout(id);
  }, [
    isLeafletPainted,
    isMapViewportReady,
    leafletRetryCount,
    open,
    shouldUseGoogle,
    setIsLeafletPainted,
    setLeafletRetryCount,
    setMapInstanceKey,
    setMapLayoutVersion,
  ]);
}
