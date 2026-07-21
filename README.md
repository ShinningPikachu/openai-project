# Offline Shape Alarm

An Android alarm app with local storage and offline alarm-dismissal challenges. Alarm scheduling, camera analysis, addition questions, and connect-the-dots all run on the device.

## Run the app

Requirements:

- Node.js and npm
- Android Studio with an Android SDK
- An Android emulator or a USB-debuggable Android device

Install dependencies, then build and launch the Android development app:

```bash
npm install
npx expo run:android --device
```

For an emulator, start it from Android Studio and run the same command without `--device`.

For later JavaScript-only changes, start Metro and open the installed development app:

```bash
npm start
```

Re-run `npx expo run:android --device` after changing native Android code or dependencies.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm test
```

## Included features

- Create, edit, enable, disable, and delete locally stored alarms.
- Choose shape photo, quick addition, or connect-the-dots dismissal challenges.
- Set alarm time with cycling 24-hour hour and minute wheels.
- Keep alarm scheduling and challenge processing on the device.
