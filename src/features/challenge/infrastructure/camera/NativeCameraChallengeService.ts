import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
import type {
  CameraChallengeCapture,
  CameraPermissionStatus,
  NativeCameraChallengeService as Service,
} from "./CameraCaptureService";
import { CameraUnavailableError } from "../../domain/ChallengeErrors";

type NativeModule = {
  requestCameraPermission(): Promise<CameraPermissionStatus>;
  getCameraPermissionStatus(): Promise<CameraPermissionStatus>;
  captureAndAnalyze(
    targetShapeId: string,
    difficulty: ChallengeDifficulty,
  ): Promise<CameraChallengeCapture>;
  openCameraSettings(): Promise<void>;
};

declare const require: (name: string) => {
  NativeModules?: Record<string, unknown>;
  Platform?: { OS?: string };
};

const reactNative = () => require("react-native");
const isAndroid = () => reactNative().Platform?.OS === "android";
const isNativeCameraUnavailable = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "CAMERA_UNAVAILABLE",
  );
const native = (): NativeModule => {
  const module = reactNative().NativeModules?.ShapeCameraChallenge as
    | NativeModule
    | undefined;
  if (!module) {
    throw new CameraUnavailableError(
      "Native camera challenge module is unavailable.",
    );
  }
  return module;
};

export class AndroidCameraChallengeService implements Service {
  async requestPermission() {
    return isAndroid() ? native().requestCameraPermission() : "restricted";
  }

  async getPermissionStatus() {
    return isAndroid() ? native().getCameraPermissionStatus() : "restricted";
  }

  async captureAndAnalyze(targetShapeId: string, difficulty: ChallengeDifficulty) {
    try {
      return await native().captureAndAnalyze(targetShapeId, difficulty);
    } catch (error) {
      if (isNativeCameraUnavailable(error)) {
        throw new CameraUnavailableError("Camera preview is unavailable.");
      }
      throw error;
    }
  }

  openAppSettings() {
    return native().openCameraSettings();
  }
}
