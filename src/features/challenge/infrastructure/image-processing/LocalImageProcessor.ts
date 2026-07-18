import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
import type { ShapeDetectionResult } from "../../domain/ShapeDetectionResult";
export interface LocalImageProcessor { analyzeShape(imageUri: string, targetShapeId: string, difficulty: ChallengeDifficulty): Promise<ShapeDetectionResult>; }
