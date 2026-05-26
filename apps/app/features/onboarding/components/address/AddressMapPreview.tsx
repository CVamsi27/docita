"use client";

import { useEffect } from "react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { GoogleMap, Marker } from "@react-google-maps/api";
import {
  MapContainer,
  Marker as LeafletMarker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression, LeafletMouseEvent } from "leaflet";
import type { Map as LeafletMapInstance } from "leaflet";
import { type LatLng, LEAFLET_MARKER_ICON } from "./address-utils";

// ---------------------------------------------------------------------------
// Leaflet helper sub-components (must live inside MapContainer)
// ---------------------------------------------------------------------------

function ClickToPick({ onPick }: { onPick: (value: LatLng) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function LeafletMapSync({
  active,
  center,
  zoom,
  layoutVersion,
}: {
  active: boolean;
  center: LatLngExpression;
  zoom: number;
  layoutVersion: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    const frame = window.requestAnimationFrame(() => {
      try {
        const container = map.getContainer();
        if (!container?.isConnected) return;
        map.invalidateSize();
        map.setView(center, zoom, { animate: false });
      } catch {
        // Ignore stale-map races while the dialog is remounting/closing.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, center, zoom, layoutVersion, map]);

  return null;
}

function LeafletMapHandle({
  onReady,
}: {
  onReady: (map: LeafletMapInstance) => void;
}) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

// ---------------------------------------------------------------------------
// AddressMapPreview
// ---------------------------------------------------------------------------

export interface AddressMapPreviewProps {
  picked: LatLng | null;
  center: LatLng;
  centerExpression: LatLngExpression;
  mapZoom: number;
  mapInstanceKey: number;
  isMapViewportReady: boolean;
  hasGoogleKey: boolean;
  isGoogleLoaded: boolean;
  googleLoadError: Error | undefined;
  shouldUseGoogle: boolean;
  open: boolean;
  mapLayoutVersion: number;
  onPickGoogle: (pos: LatLng) => void | Promise<void>;
  onPickOSM: (pos: LatLng) => void | Promise<void>;
  onGoogleLoad: (map: google.maps.Map) => void;
  onLeafletLoad: (map: LeafletMapInstance) => void;
  onLeafletPaint: () => void;
}

export function AddressMapPreview({
  picked,
  center,
  centerExpression,
  mapZoom,
  mapInstanceKey,
  isMapViewportReady,
  hasGoogleKey,
  isGoogleLoaded,
  googleLoadError,
  shouldUseGoogle,
  open,
  mapLayoutVersion,
  onPickGoogle,
  onPickOSM,
  onGoogleLoad,
  onLeafletLoad,
  onLeafletPaint,
}: AddressMapPreviewProps) {
  if (!isMapViewportReady) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
        Preparing map…
      </div>
    );
  }

  if (hasGoogleKey && !isGoogleLoaded && !googleLoadError) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
        Loading map…
      </div>
    );
  }

  if (shouldUseGoogle) {
    return (
      <GoogleMap
        key={`google-map-${mapInstanceKey}`}
        onLoad={(map) => {
          onGoogleLoad(map);
        }}
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={picked ? 16 : 5}
        options={{
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
        }}
        onClick={(event) => {
          const lat = event.latLng?.lat();
          const lng = event.latLng?.lng();
          if (typeof lat !== "number" || typeof lng !== "number") return;
          void onPickGoogle({ lat, lng });
        }}
      >
        {picked ? (
          <Marker
            position={picked}
            draggable
            onDragEnd={(event) => {
              const lat = event.latLng?.lat();
              const lng = event.latLng?.lng();
              if (typeof lat !== "number" || typeof lng !== "number") return;
              void onPickGoogle({ lat, lng });
            }}
          />
        ) : null}
      </GoogleMap>
    );
  }

  return (
    <MapContainer
      key={`leaflet-map-${mapInstanceKey}`}
      center={centerExpression}
      zoom={mapZoom}
      scrollWheelZoom
    >
      <LeafletMapHandle onReady={onLeafletLoad} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          tileload: onLeafletPaint,
          load: onLeafletPaint,
        }}
      />
      <ClickToPick onPick={onPickOSM} />
      <LeafletMapSync
        active={open}
        center={centerExpression}
        zoom={mapZoom}
        layoutVersion={mapLayoutVersion}
      />
      {picked ? (
        <LeafletMarker
          position={[picked.lat, picked.lng]}
          icon={LEAFLET_MARKER_ICON}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const target = event.target;
              if (
                !target ||
                typeof target !== "object" ||
                !("getLatLng" in target) ||
                typeof target.getLatLng !== "function"
              ) {
                return;
              }
              const ll = target.getLatLng();
              void onPickOSM({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
