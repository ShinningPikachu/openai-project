import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";
export interface ShapeTarget { id: string; name: string; description: string; minimumConfidence: number; supportedDifficulties: ChallengeDifficulty[]; }
export const challengeThresholds: Record<ChallengeDifficulty, number> = { easy: 0.55, normal: 0.68, hard: 0.8 };
export const elongatedShapeTarget: ShapeTarget = { id: "elongated", name: "Elongated object", description: "An object that is clearly longer than it is wide", minimumConfidence: challengeThresholds.normal, supportedDifficulties: ["easy", "normal", "hard"] };
