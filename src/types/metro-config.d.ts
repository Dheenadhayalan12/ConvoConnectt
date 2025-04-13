declare module "expo/metro-config" {
    import { MetroConfig } from "metro-config";
  
    export function getDefaultConfig(projectRoot: string): MetroConfig;
  }
  