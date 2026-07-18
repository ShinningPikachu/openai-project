import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
import type { NativeCameraChallengeService } from "../infrastructure/camera/CameraCaptureService";
export async function analyzeCapturedImage(service: NativeCameraChallengeService, targetShapeId: string, difficulty: ChallengeDifficulty) { return service.captureAndAnalyze(targetShapeId, difficulty); }
