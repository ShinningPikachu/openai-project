# Offline Shape Alarm

An offline-first Android alarm foundation built with React Native, Expo Router, TypeScript, SQLite, Zod, and Zustand. It supports creating, editing, toggling, deleting, and locally persisting alarms, plus settings and a shape-challenge placeholder.

## Run on Android

Install Node.js, Android Studio (including an Android SDK), and a USB-debuggable Android device. Then run:

```bash
npm install
npx expo prebuild --platform android
npx expo run:android --device
npm start
```

This uses an Expo development build, rather than Expo Go, because future alarm scheduling, foreground services, full-screen intents, camera capture, boot receivers, and OpenCV need native Android code. Re-run prebuild after adding native Expo config plugins or native dependencies.

## Architecture and data

- `app/`: Expo Router screens only; no SQLite access.
- `src/features/*/domain`: Zod-validated models and repository contracts.
- `src/features/*/application`: explicit alarm and settings use cases.
- `src/features/*/infrastructure`: SQLite repositories and record mapping.
- `src/database`: versioned schema migrations and initialization.
- `src/state`: shared screen state; SQLite remains the source of truth.
- `src/platform`: contracts and safe placeholders for future native integrations.

SQLite creates durable `alarms`, `app_settings`, and `migrations` tables. Data stays on-device: there are no HTTP clients, authentication, analytics, cloud services, or external APIs.

## Checks

```bash
npm test
npm run lint
```

Tests cover validation and time/repeat-day formatting. Add repository integration tests when running against an Expo SQLite-compatible test environment.

## Future extensions and current limits

Implement `AlarmScheduler` with an Android `AlarmManager` module, then invoke it from application use cases—not screens. Replace the deferred camera and detection services in `src/platform` with local camera and OpenCV/TFLite modules.

Real scheduling, foreground service, full-screen intents, boot handling, camera capture, image segmentation/recognition, OpenCV, TensorFlow Lite, AI APIs, cloud sync, and accounts are deliberately deferred. The challenge route is navigation-only.
