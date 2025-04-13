declare module 'firebase/auth/react-native' {
  import type {
    initializeAuth as _initializeAuth,
    getReactNativePersistence as _getReactNativePersistence,
  } from 'firebase/auth';

  import type { Persistence } from 'firebase/auth';

  export const initializeAuth: typeof _initializeAuth;
  export const getReactNativePersistence: typeof _getReactNativePersistence;

  export * from 'firebase/auth';
}
