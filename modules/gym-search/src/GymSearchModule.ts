import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { PlaceResult } from './GymSearch.types';

declare class GymSearchModule extends NativeModule<{}> {
  search(query: string, latitude: number | null, longitude: number | null): Promise<PlaceResult[]>;
  nearbyGyms(latitude: number, longitude: number, radiusMeters: number): Promise<PlaceResult[]>;
}

// Optional so an app binary built before this module existed still runs —
// callers fall back to the plain address geocoder.
export default requireOptionalNativeModule<GymSearchModule>('GymSearch');
