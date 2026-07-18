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

## Phase 2 native Android alarm scheduling

This project now uses a committed Expo prebuild Android project plus a small manually registered React Native native module (`ShapeAlarmScheduler`) in Kotlin. It is intended for Expo development builds and `expo run:android`; it is not designed for Expo Go because alarms require `AlarmManager`, foreground services, boot receivers, notification channels, and full-screen intents.

The TypeScript app calculates the next occurrence in one domain function, `getNextAlarmOccurrence`, then sends a minimal validated native payload to Android. The native side stores that payload in a SharedPreferences schedule registry as an operational cache so enabled alarms can be restored after reboot, package replacement, manual time changes, or timezone changes without starting the JavaScript runtime. The SQLite alarm table remains the user-facing source of truth, and startup reconciliation resubmits enabled alarms to the native registry.

Android scheduling uses `AlarmManager.setAlarmClock` for user-visible alarms. If exact alarm access is denied on Android versions that require it, scheduling fails with a typed bridge error instead of silently claiming reliability. Android 13 notification permission status is exposed through the native bridge, and settings helpers open exact-alarm and notification settings only after user action.

When an alarm fires, `AlarmReceiver` validates the payload, starts `AlarmForegroundService`, and schedules the next occurrence for repeating alarms before the user dismisses the current ringing session. The foreground service owns active playback state, loops a bundled local alarm tone, optionally starts repeating vibration, and maintains a high-priority alarm notification with a full-screen content intent. The native full-screen `AlarmActivity` provides the temporary five-second `Hold to dismiss` challenge and a ten-second emergency override; camera, OpenCV, image processing, and shape recognition remain deferred.

Multiple simultaneous alarms use an MVP single-session rule: the service prevents duplicate playback for the same alarm and keeps one active foreground audio/vibration session. Closely overlapping alarms may replace the visible session instead of starting overlapping players; this limitation should be revisited when queued alarm sessions are implemented.

### Development alarm test screen

A development-only screen is available from the alarm list in `__DEV__` builds. It can schedule a test alarm 10 or 60 seconds from now, cancel the test alarm, and display permission status, active alarm state, and native registry records. It is hidden in production builds.

### Manual Android test checklist

Record the physical device model, Android version, and manufacturer battery settings before testing.

- [ ] One-time alarm rings with app open.
- [ ] One-time alarm rings with app backgrounded.
- [ ] One-time alarm rings after app is swiped away.
- [ ] Alarm can alert on the lock screen, subject to Android full-screen restrictions.
- [ ] Sound loops until a camera challenge succeeds or emergency override completes.
- [ ] Vibration repeats when enabled and stops immediately on dismissal.
- [ ] Foreground notification remains visible while ringing.
- [ ] Notification opens the ringing interface.
- [ ] Emergency override requires a ten-second hold and stops the alarm.
- [ ] Repeating alarm schedules its next occurrence after firing.
- [ ] Editing an enabled alarm cancels the old native schedule and creates the new one.
- [ ] Disabling and deleting alarms cancel native schedules.
- [ ] Enabled alarms restore after reboot.
- [ ] Device time changes reschedule registered alarms.
- [ ] Device timezone changes reschedule registered alarms.
- [ ] Notification permission denied state is visible and does not repeatedly prompt.
- [ ] Exact alarm permission denied state prevents false reliability claims.
- [ ] Two close alarms do not create overlapping audio players.

### Known limitations

- Android OEM battery restrictions can still delay or suppress background work; the app exposes permission state but cannot guarantee identical behaviour on all vendor builds.
- Full-screen intents are subject to current Android policy and user settings, so users may need to open the persistent notification manually.
- The native registry is an operational cache synchronized by app use cases; if a native schedule fails, the app disables the corresponding SQLite alarm rather than showing it as reliably enabled.
- Custom sounds and advanced OpenCV/ML classification remain deferred; the current camera challenge uses a lightweight local elongated-shape analyzer.


## Phase 3 offline camera challenge foundation

The temporary long-press challenge is being replaced by a camera challenge for the first supported target: **Elongated object**. The React Native layer owns challenge state, retry/result presentation, and completion history creation, while Android owns camera capture and local bitmap analysis through the `ShapeCameraChallenge` native module. Captures are written to app cache through a `FileProvider`, analyzed locally, and cleaned by a shared temporary-image cleanup method. Photos are not uploaded and are not intentionally stored permanently.

The initial detector is a deterministic contour-style bitmap pipeline rather than a cloud or ML model. It resizes large images, estimates brightness, thresholds foreground against the scene average, extracts connected foreground components, selects the dominant component, computes bounding-box features, approximates oriented aspect ratio from the dominant component dimensions, and scores elongated-object confidence with configurable TypeScript thresholds for easy, normal, and hard difficulties.

OpenCV remains isolated behind the local image-processor interface and can replace the current Android bitmap analyzer later without changing the challenge state machine or alarm service integration. Alarm audio, vibration, foreground notification, and active alarm state remain owned by the native alarm foreground service while the camera capture flow runs. A successful accepted result validates the active native alarm ID before sending the standard stop command; rejected and failed captures keep the alarm active. Emergency override remains available from the challenge UI.

### Phase 3 manual camera test checklist

- [ ] Camera permission granted.
- [ ] Camera permission denied and app settings opened.
- [ ] Capture a clearly elongated object such as a pen, spoon, toothbrush, or remote.
- [ ] Capture a square or circular object and verify rejection.
- [ ] Capture multiple objects and verify the multiple-object or low-confidence rejection path.
- [ ] Capture an object near the border and verify cropped-object guidance.
- [ ] Capture a dark scene and verify the dark-image message.
- [ ] Retry five rejected attempts while alarm audio/vibration continue.
- [ ] Accept a valid elongated object and verify the native alarm stops only after validation.
- [ ] Use emergency override when camera permission or capture fails.
- [ ] Confirm temporary cached challenge images are cleaned on startup or next challenge open.
