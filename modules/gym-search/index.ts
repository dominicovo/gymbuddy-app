// Re-export the native module. On web, it will be resolved to GymSearchModule.web.ts
// and on native platforms to GymSearchModule.ts
export { default } from './src/GymSearchModule';
export * from './src/GymSearch.types';
