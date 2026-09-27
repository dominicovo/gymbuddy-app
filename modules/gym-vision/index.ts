// Re-export the native module. On web, it will be resolved to GymVisionModule.web.ts
// and on native platforms to GymVisionModule.ts
export { default } from './src/GymVisionModule';
export * from './src/GymVision.types';
