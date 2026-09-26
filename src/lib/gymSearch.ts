import * as Location from 'expo-location';
import GymSearch, { type PlaceResult } from '../../modules/gym-search';
import { Coordinates, distanceInMeters } from './geo';
import { ResolvedLocation, searchLocation } from './location';

export interface GymOption extends PlaceResult {
  /** From the user, when their position is known. */
  distanceMeters: number | null;
}

const NEARBY_RADIUS_METERS = 5000;
const MAX_RESULTS = 8;
const METERS_PER_MILE = 1609.344;

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

/** Where the user is, without prompting — null unless location is already allowed. */
export async function currentPositionIfAllowed(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    const fix = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
  } catch {
    return null;
  }
}

function withDistance(results: PlaceResult[], near: Coordinates | null): GymOption[] {
  const seen = new Set<string>();
  return results
    .filter((r) => {
      // Apple sometimes returns the same place twice (e.g. a gym and its building).
      const key = `${r.name.toLowerCase()}|${r.latitude.toFixed(4)}|${r.longitude.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => ({ ...r, distanceMeters: near ? distanceInMeters(near, r) : null }));
}

/**
 * Anything someone might type for their gym — its name ("PureGym Shoreditch"),
 * a brand, an address or a postcode. Gyms come first; Apple's relevance order
 * is kept within each group, so an exact name match still leads.
 */
export async function searchGyms(query: string, near: Coordinates | null): Promise<GymOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (!GymSearch) {
    // App built before the native module existed: best-effort address lookup.
    const hit = await searchLocation(trimmed).catch(() => null);
    return hit ? withDistance([{ name: hit.label, address: '', latitude: hit.latitude, longitude: hit.longitude, isGym: false }], near) : [];
  }

  const results = withDistance(await GymSearch.search(trimmed, near?.latitude ?? null, near?.longitude ?? null), near);
  return [...results.filter((r) => r.isGym), ...results.filter((r) => !r.isGym)].slice(0, MAX_RESULTS);
}

/** Gyms around a point, nearest first. Empty when Apple Maps knows none, or the module is missing. */
export async function gymsNearby(near: Coordinates): Promise<GymOption[]> {
  if (!GymSearch) return [];
  const results = withDistance(await GymSearch.nearbyGyms(near.latitude, near.longitude, NEARBY_RADIUS_METERS), near);
  return results.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)).slice(0, MAX_RESULTS);
}

/** What gets saved as the user's gym — the name people recognise, plus the street to tell branches apart. */
export function toResolvedLocation(option: GymOption): ResolvedLocation {
  const street = option.address.split(', ')[0];
  const label = street && street !== option.name ? `${option.name}, ${street}` : option.name || option.address;
  return { latitude: option.latitude, longitude: option.longitude, label };
}
