import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Offline Shape Alarm",
  slug: "offline-shape-alarm",
  scheme: "shapealarm",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: ["expo-router", "expo-sqlite"],
  android: { package: "com.example.offlineshapealarm" },
  experiments: { typedRoutes: true },
};

export default config;
