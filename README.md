# Offline Shape Alarm

An Android alarm app that can only be dismissed by completing an offline challenge. Alarms, camera analysis, challenge logic, and local persistence run on the device; the installed app does not call an OpenAI service or require an API key.

## What judges should know

- This is an Android-only Expo/React Native development build. It will not work in Expo Go because it includes custom Kotlin native modules for alarms and camera analysis.
- Use a physical Android device for the complete demo. An emulator can run the app, but it cannot demonstrate a real camera challenge or all alarm/full-screen behaviours reliably.
- The first run needs network access only to install npm and Gradle dependencies. Once installed, alarm scheduling, ringing, local storage, and all three challenges work offline.
- Grant the requested **Camera** and **Notifications** permissions. On Android 12 or newer, also allow **Alarms & reminders** when Android asks; otherwise exact alarms cannot be scheduled.
- To demo the shape challenge, use one clear circle, triangle, square, or rectangle on a plain, contrasting background. Keep it centred in the on-screen guide and still for about one second.

## Requirements

- Node.js 20 LTS or newer, including npm
- JDK 17
- Android Studio with Android SDK Platform 35 and an Android emulator, or a USB-debuggable Android device
- Android 7.0 (API 24) or later; a recent physical device is recommended for the alarm and camera demo
- A camera-equipped Android device for the full shape-photo challenge

The app itself needs no backend, account, API key, environment variable, or dataset download.

### Android command-line setup

Android Studio normally configures these paths. If Gradle cannot find Java 17 or the Android SDK, set them before building (use the paths for the judge machine):

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/Android/Sdk
```

As an alternative to `ANDROID_HOME`, create an untracked `android/local.properties` file containing `sdk.dir=/absolute/path/to/Android/Sdk`. Do not commit this machine-specific file.

## Run the app

Install the locked dependencies:

```bash
npm ci
```

Build and install the Android development app on a connected device:

```bash
npx expo run:android --device
```

For an emulator, start it from Android Studio, then run:

```bash
npx expo run:android
```

After the first native build, use Metro for JavaScript/TypeScript-only changes:

```bash
npm start
```

Re-run `npx expo run:android --device` after changing Kotlin code, Android resources or configuration, or native dependencies.

## Judge demo flow

1. Launch the installed development build and accept the permissions above.
2. Create an alarm one or two minutes in the future and choose **Shape photo** as the challenge.
3. When it rings, the app starts an Android foreground alarm service with sound/vibration and an ongoing notification. Tap the notification or the highlighted **Ringing** alarm card to resume the challenge.
4. Point the back camera at the selected shape, keep it inside the guide, and hold it steady until the match is accepted. The alarm stops only after the challenge completes.
5. For a fast non-camera walkthrough, choose **Quick addition** or **Connect the dots** instead.

## Architecture

The project keeps product logic separate from platform code so the app UI, alarm workflow, and camera analysis have clear boundaries.

```text
app/                         Expo Router screens and navigation
src/components/              Reusable React Native UI components
src/features/alarms/         Alarm domain model, use cases, and SQLite repository
src/features/challenge/      Challenge domain, presentation, and completion workflow
src/features/settings/       Local settings model and repository
src/platform/                TypeScript contracts for native alarm/camera services
android/.../alarm/           Kotlin alarm scheduler, receiver, service, notification, and activity
android/.../challenge/       CameraX activity, shape-detection pipeline, and React Native bridge
```

The React Native layer owns editing alarms, navigation, settings, and challenge presentation. SQLite stores alarms and settings locally. Kotlin native modules expose two narrow bridges: one schedules and controls Android alarms, and the other runs the camera challenge. The alarm path uses `AlarmManager`, a broadcast receiver, a foreground service, an ongoing notification, and a lock-screen alarm activity. The active alarm ID is retained locally, which lets the UI highlight a ringing alarm and reopen its challenge if the user leaves the alarm screen.

## Offline shape detection

The shape-photo challenge uses a deterministic, classical computer-vision pipeline implemented in Kotlin in `ShapeDetectionPipeline.kt`; it does not use a cloud vision API or a trained model at runtime.

1. CameraX supplies YUV frames at 640×480. The analyser keeps only the latest frame, processes at most one frame every 100 ms, corrects rotation, reduces the frame to a maximum working dimension of 320 pixels, and crops to the centred guide region.
2. The pipeline normalises luminance contrast and applies a 3×3 box blur. It first looks for consistent YUV colour regions; when no suitable region is found, it falls back to adaptive dark/light thresholding and Sobel edges. Morphological opening/closing and hole filling remove small gaps and noise.
3. Connected components are extracted from those masks. Candidates that are too small, too large, too close to the crop edge, too far from the centre, or competing with another large object are rejected.
4. For each remaining candidate, the app derives geometric descriptors: convex hull, area, perimeter, oriented bounding-box ratio, circularity, solidity, convexity, extent, approximate corner count, Hu moments, a rotation-normalised radial contour signature, a normalised silhouette, and an axis width profile.
5. Candidate descriptors are compared with templates for the selectable circle, triangle, square, and rectangle targets. The native detector also retains a spoon-like template for internal compatibility and test coverage. A per-shape weighted score combines contour/silhouette similarity, polygon/corner fit, circularity, aspect ratio, Hu-moment similarity, width profile, colour uniformity, area, and position. Difficulty selects progressively stricter acceptance thresholds.
6. A competing-shape check prevents a low-confidence lookalike from passing. Finally, a temporal tracker smooths recent confidence values and requires a valid match for approximately one second, with a brief grace period for partial-frame dropouts, before it dismisses the alarm.

The native test suite covers feature extraction, threshold ordering, distractors outside the guide, lighting variation, rotation, partial occlusion, multiple objects, and rejection of unrelated/tiny/noisy inputs. The behaviour is intentionally explainable: the camera UI reports whether it needs a clearer object, a closer object, a better-centred object, or a steadier hold.

## How OpenAI Codex 5.6 was involved

This project was developed in a human-directed workflow with **OpenAI Codex 5.6** as the implementation collaborator. Codex assisted with implementing and refining most of the codebase, including:

- the Expo Router and React Native interface, local SQLite repositories, alarm editor, settings, and challenge screens;
- the Kotlin/React Native bridge, exact-alarm scheduling, foreground ringing service, notification, lock-screen alarm activity, and recovery path back into an active challenge;
- the CameraX integration, shape-detection architecture and algorithm described above, calibration thresholds, and deterministic Kotlin tests; and
- TypeScript and Kotlin test coverage, static checks, and documentation updates.

The human author defined the product requirements, reviewed the generated implementation, made the final design decisions, and validated the app on Android. Codex is a development-time tool only: it is not embedded in the shipped app, does not receive camera frames or alarm data, and the application makes no runtime request to OpenAI.

## Verification

Run the JavaScript/TypeScript checks from the repository root:

```bash
npx tsc --noEmit
npm run lint
npm test
```

Run the native JVM tests from the `android` directory:

```bash
./gradlew :app:testDebugUnitTest
```

## Included features

- Create, edit, enable, disable, and delete locally stored alarms.
- Exact Android alarm scheduling with a foreground ringing service, sound, vibration, notification, snooze, and boot/time-change rescheduling.
- A highlighted active-alarm card that returns the user to the challenge if they leave the alarm screen.
- Shape-photo, quick-addition, and connect-the-dots dismissal challenges.
- On-device shape detection for circle, triangle, square, and rectangle targets.
- Local settings for challenge difficulty and an optional emergency override.
