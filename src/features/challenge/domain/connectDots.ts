import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";

export interface ConnectDot {
  x: number;
  y: number;
}

export interface ConnectDotsPattern {
  points: readonly ConnectDot[];
}

type Random = () => number;

const pointCounts: Record<ChallengeDifficulty, number> = {
  easy: 6,
  normal: 8,
  hard: 10,
};

const gridSize = 4;
const jitter = 0.02;

const shuffle = <T>(items: readonly T[], random: Random): T[] => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex]!,
      shuffled[index]!,
    ];
  }
  return shuffled;
};

const gridCells = Array.from({ length: gridSize * gridSize }, (_, index) => ({
  column: index % gridSize,
  row: Math.floor(index / gridSize),
}));

export function generateConnectDotsPattern(random?: Random): ConnectDotsPattern;
export function generateConnectDotsPattern(
  difficulty: ChallengeDifficulty,
  random?: Random,
): ConnectDotsPattern;
export function generateConnectDotsPattern(
  difficultyOrRandom: ChallengeDifficulty | Random = "normal",
  providedRandom: Random = Math.random,
): ConnectDotsPattern {
  const random =
    typeof difficultyOrRandom === "function"
      ? difficultyOrRandom
      : providedRandom;
  const difficulty =
    typeof difficultyOrRandom === "function" ? "normal" : difficultyOrRandom;
  const selectedCells = shuffle(gridCells, random).slice(
    0,
    pointCounts[difficulty],
  );

  return {
    points: selectedCells.map(({ column, row }) => ({
      x: (column + 0.5) / gridSize + (random() - 0.5) * jitter * 2,
      y: (row + 0.5) / gridSize + (random() - 0.5) * jitter * 2,
    })),
  };
}
