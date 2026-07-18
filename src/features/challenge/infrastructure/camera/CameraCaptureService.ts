import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
import type { ShapeDetectionResult } from "../../domain/ShapeDetectionResult";
export type CameraPermissionStatus = "granted" | "denied" | "restricted" | "unknown";
export interface CapturedImage { uri: string; width: number; height: number; rotation: number; capturedAt: string; }
export interface CameraCaptureService { requestPermission(): Promise<CameraPermissionStatus>; getPermissionStatus(): Promise<CameraPermissionStatus>; capture(): Promise<CapturedImage>; }
export interface NativeCameraChallengeService extends CameraCaptureService { captureAndAnalyze(targetShapeId: string, difficulty: ChallengeDifficulty): Promise<{ image: CapturedImage; result: ShapeDetectionResult }>; openAppSettings(): Promise<void>; cleanupTemporaryImages(): Promise<void>; }
