//src/types/metro-config.d.ts

declare module "expo/metro-config" {
    import { MetroConfig } from "metro-config";
  
    export function getDefaultConfig(projectRoot: string): MetroConfig;
  }
  