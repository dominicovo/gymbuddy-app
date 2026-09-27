import { registerWebModule, NativeModule } from 'expo';

// GymVisionModule is not available on the web platform.
class GymVisionModule extends NativeModule<{}> {}

export default registerWebModule(GymVisionModule, 'GymVisionModule');
