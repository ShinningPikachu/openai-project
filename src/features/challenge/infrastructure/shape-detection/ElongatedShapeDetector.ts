import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
import { challengeThresholds } from "../../domain/ShapeTarget";
import type { ShapeFeatures } from "../../domain/ShapeFeatures";
import type { ShapeDetectionResult } from "../../domain/ShapeDetectionResult";
export interface ElongatedShapeConfig { minimumAspectRatio: number; minimumAreaRatio: number; maximumAreaRatio: number; minimumSolidity: number; maximumBorderContactRatio: number; acceptanceThreshold: number; }
export const defaultElongatedShapeConfig: Omit<ElongatedShapeConfig, "acceptanceThreshold"> = { minimumAspectRatio: 2.3, minimumAreaRatio: 0.05, maximumAreaRatio: 0.7, minimumSolidity: 0.55, maximumBorderContactRatio: 0.2 };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const normalizeAspectRatio = (ratio: number) => Math.max(1, ratio);
export const scoreAspectRatio = (ratio: number) => clamp((normalizeAspectRatio(ratio) - 1.5) / 2.5);
export const scoreImageArea = (ratio: number) => ratio < 0.05 || ratio > 0.7 ? 0 : ratio >= 0.15 && ratio <= 0.45 ? 1 : ratio < 0.15 ? clamp((ratio - 0.05) / 0.1) : clamp((0.7 - ratio) / 0.25);
export const scoreBorderContact = (ratio: number) => clamp(1 - ratio / 0.2);
export function scoreElongatedFeatures(features: ShapeFeatures, difficulty: ChallengeDifficulty, dominantContourScore = 1, imageQualityScore = 1): ShapeDetectionResult { const confidence = clamp(scoreAspectRatio(features.orientedAspectRatio) * 0.4 + scoreImageArea(features.imageAreaRatio) * 0.15 + clamp((features.solidity - 0.45) / 0.55) * 0.15 + dominantContourScore * 0.15 + imageQualityScore * 0.15); const accepted = confidence >= challengeThresholds[difficulty] && features.orientedAspectRatio >= defaultElongatedShapeConfig.minimumAspectRatio && features.imageAreaRatio >= defaultElongatedShapeConfig.minimumAreaRatio && features.imageAreaRatio <= defaultElongatedShapeConfig.maximumAreaRatio && features.solidity >= defaultElongatedShapeConfig.minimumSolidity && features.borderContactRatio <= defaultElongatedShapeConfig.maximumBorderContactRatio; return { accepted, confidence, targetShapeId: "elongated", features, failureReason: accepted ? undefined : "shape-does-not-match", processingDurationMs: 0 }; }
