import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
import type { NativeCameraChallengeService as Service, CameraPermissionStatus, CapturedImage } from "./CameraCaptureService";
import type { ShapeDetectionResult } from "../../domain/ShapeDetectionResult";
import { CameraUnavailableError } from "../../domain/ChallengeErrors";
type NativeModule = { requestCameraPermission(): Promise<CameraPermissionStatus>; getCameraPermissionStatus(): Promise<CameraPermissionStatus>; captureAndAnalyze(targetShapeId: string, difficulty: ChallengeDifficulty): Promise<{ image: CapturedImage; result: ShapeDetectionResult }>; openCameraSettings(): Promise<void>; cleanupTemporaryImages(): Promise<void>; };
declare const require: (name: string) => { NativeModules?: Record<string, unknown>; Platform?: { OS?: string } };
const reactNative = () => require("react-native");
const isAndroid = () => reactNative().Platform?.OS === "android";
const native = (): NativeModule => { const module = reactNative().NativeModules?.ShapeCameraChallenge as NativeModule | undefined; if (!module) throw new CameraUnavailableError("Native camera challenge module is unavailable."); return module; };
export class AndroidCameraChallengeService implements Service { async requestPermission() { return isAndroid() ? native().requestCameraPermission() : "restricted"; } async getPermissionStatus() { return isAndroid() ? native().getCameraPermissionStatus() : "restricted"; } async capture(): Promise<CapturedImage> { const response = await this.captureAndAnalyze("elongated", "normal"); return response.image; } captureAndAnalyze(targetShapeId: string, difficulty: ChallengeDifficulty) { return native().captureAndAnalyze(targetShapeId, difficulty); } openAppSettings() { return native().openCameraSettings(); } cleanupTemporaryImages() { return isAndroid() ? native().cleanupTemporaryImages() : Promise.resolve(); } }
