import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { Classification } from './GymVision.types';

declare class GymVisionModule extends NativeModule<{}> {
  classify(uri: string, minConfidence: number): Promise<Classification[]>;
}

// Optional so an app binary built before this module existed still runs —
// the check-in then skips the photo check instead of crashing.
export default requireOptionalNativeModule<GymVisionModule>('GymVision');
