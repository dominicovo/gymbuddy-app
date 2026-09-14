import * as Location from 'expo-location';
import { Coordinates } from './geo';

export interface ResolvedLocation extends Coordinates {
  label: string;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

function formatCoordinates(coords: Coordinates): string {
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

/** Reverse-geocodes coordinates into a short human-readable label. Falls back to raw coordinates. */
export async function describeCoordinates(coords: Coordinates): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coords);
    if (!place) return formatCoordinates(coords);
    const parts = [place.name, place.street, place.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : formatCoordinates(coords);
  } catch {
    return formatCoordinates(coords);
  }
}

const LOCATION_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

export async function getCurrentLocation(): Promise<ResolvedLocation | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    const granted = await requestLocationPermission();
    if (!granted) return null;
  }

  const position = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    LOCATION_TIMEOUT_MS,
    'Timed out waiting for a GPS fix'
  );
  const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  const label = await describeCoordinates(coords);
  return { ...coords, label };
}

/** Looks up an address or place name (e.g. "Planet Fitness, Springfield") and returns the best match. */
export async function searchLocation(query: string): Promise<ResolvedLocation | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const results = await Location.geocodeAsync(trimmed);
  if (results.length === 0) return null;

  const coords = { latitude: results[0].latitude, longitude: results[0].longitude };
  const label = await describeCoordinates(coords);
  return { ...coords, label };
}
