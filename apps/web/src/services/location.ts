/**
 * Optional location helper for alert SMS links.
 * Requires explicit user/geolocation permission; never called without consent.
 * No network APIs beyond the browser Geolocation API itself.
 */

export interface LocationResult {
  lat: number;
  lng: number;
  accuracyM: number | null;
  /** OpenStreetMap link (no API key; works offline as a URL string). */
  mapsUrl: string;
}

export type LocationErrorCode = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class LocationError extends Error {
  readonly code: LocationErrorCode;
  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'LocationError';
  }
}

/** Builds a shareable maps URL from coordinates. */
export function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

/**
 * Requests a one-shot GPS fix for alert SMS.
 * Call only after the mother has consented to share location with CHP/family.
 */
export function requestAlertLocation(timeoutMs: number = 12_000): Promise<LocationResult> {
  if (!('geolocation' in navigator)) {
    return Promise.reject(new LocationError('unsupported', 'Geolocation is not available on this device.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        resolve({
          lat,
          lng,
          accuracyM: pos.coords.accuracy ?? null,
          mapsUrl: buildMapsUrl(lat, lng),
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new LocationError('denied', 'Location permission denied.'));
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(new LocationError('timeout', 'Location request timed out.'));
          return;
        }
        reject(new LocationError('unavailable', 'Location unavailable.'));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
