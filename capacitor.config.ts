import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.ironfang.beastfire",
  appName: "IRONFANG: BEASTFIRE",
  webDir: "dist",
  bundledWebRuntime: false,
  android: { allowMixedContent: false },
  ios: { contentInset: "automatic" }
};
export default config;
