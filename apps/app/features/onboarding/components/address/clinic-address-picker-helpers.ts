import type { LatLngExpression } from "leaflet";
import type { LatLng } from "./address-utils";

export function getAddressValue(
  addressDraft: string,
  resolvedAddress: string,
  initialAddress: string,
): string {
  return addressDraft || resolvedAddress || initialAddress;
}

export function getCenter(
  picked: LatLng | null,
  defaultCenter: LatLng,
): LatLng {
  return picked ?? defaultCenter;
}

export function getMapZoom(picked: LatLng | null): number {
  return picked ? 16 : 5;
}

export function getCenterExpression(
  center: LatLng,
): LatLngExpression {
  return [center.lat, center.lng];
}

export function triggerGoogleMapResize(
  googleMap: google.maps.Map | null,
  center: LatLng,
  shouldUseGoogle: boolean,
): void {
  if (!shouldUseGoogle || !googleMap) return;
  window.google.maps.event.trigger(googleMap, "resize");
  googleMap.setCenter(center);
}
