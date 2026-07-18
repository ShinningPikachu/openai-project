import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Offline Shape Alarm",
  slug: "offline-shape-alarm",
  scheme: "shapealarm",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: ["expo-router", "expo-sqlite"],
  android: { package: "com.example.offlineshapealarm", permissions: ["CAMERA", "VIBRATE", "WAKE_LOCK", "POST_NOTIFICATIONS", "SCHEDULE_EXACT_ALARM", "USE_FULL_SCREEN_INTENT", "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_MEDIA_PLAYBACK", "RECEIVE_BOOT_COMPLETED"] },
  experiments: { typedRoutes: true },
};

export default config;
