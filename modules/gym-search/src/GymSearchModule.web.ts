import { registerWebModule, NativeModule } from 'expo';

// GymSearchModule is not available on the web platform.
class GymSearchModule extends NativeModule<{}> {}

export default registerWebModule(GymSearchModule, 'GymSearchModule');
