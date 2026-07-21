import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
import type { ShapeDetectionResult } from "../../domain/ShapeDetectionResult";

export type CameraPermissionStatus = "granted" | "denied" | "restricted" | "unknown";

export interface CameraChallengeCapture {
  image: null;
  result: ShapeDetectionResult;
}

export interface CameraCaptureService {
  requestPermission(): Promise<CameraPermissionStatus>;
  getPermissionStatus(): Promise<CameraPermissionStatus>;
}

export interface NativeCameraChallengeService extends CameraCaptureService {
  captureAndAnalyze(
    targetShapeId: string,
    difficulty: ChallengeDifficulty,
  ): Promise<CameraChallengeCapture>;
  openAppSettings(): Promise<void>;
}
