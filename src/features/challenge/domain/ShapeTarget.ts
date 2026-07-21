import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";

export type SimpleShapeTargetId = "circle" | "triangle" | "square" | "rectangle" | "spoon";

export interface ShapeTarget {
  id: SimpleShapeTargetId;
  name: string;
  description: string;
  minimumConfidence: number;
  supportedDifficulties: ChallengeDifficulty[];
}

export const challengeThresholds: Record<ChallengeDifficulty, number> = {
  easy: 0.53,
  normal: 0.64,
  hard: 0.74,
};

export const defaultShapeTargetId: SimpleShapeTargetId = "circle";

export const simpleShapeTargets: readonly ShapeTarget[] = [
  {
    id: "circle",
    name: "Circle / Round",
    description: "Any object with a clear round outline",
    minimumConfidence: challengeThresholds.normal,
    supportedDifficulties: ["easy", "normal", "hard"],
  },
  {
    id: "triangle",
    name: "Triangle",
    description: "Any object with a clear triangular outline",
    minimumConfidence: challengeThresholds.normal,
    supportedDifficulties: ["easy", "normal", "hard"],
  },
  {
    id: "square",
    name: "Square",
    description: "Any object with a clear square-like outline",
    minimumConfidence: challengeThresholds.normal,
    supportedDifficulties: ["easy", "normal", "hard"],
  },
  {
    id: "rectangle",
    name: "Rectangle",
    description: "Any object with a clear rectangular outline",
    minimumConfidence: challengeThresholds.normal,
    supportedDifficulties: ["easy", "normal", "hard"],
  },
  {
    id: "spoon",
    name: "Spoon-like silhouette",
    description: "A long shape with one distinctly wider end and a narrow handle",
    minimumConfidence: challengeThresholds.normal,
    supportedDifficulties: ["easy", "normal", "hard"],
  },
];

export function normalizeShapeTargetId(
  value: string | null | undefined,
): SimpleShapeTargetId {
  if (value === "circle" || value === "triangle" || value === "square" || value === "rectangle" || value === "spoon") {
    return value;
  }
  if (value === "elongated") return "spoon";
  return defaultShapeTargetId;
}
