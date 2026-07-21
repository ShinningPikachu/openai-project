import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";

export interface AdditionQuestion {
  left: number;
  right: number;
  total: number;
}

type Random = () => number;

const ranges: Record<ChallengeDifficulty, { minimumTotal: number; maximumTotal: number; minimumAddend: number }> = {
  easy: { minimumTotal: 6, maximumTotal: 10, minimumAddend: 1 },
  normal: { minimumTotal: 7, maximumTotal: 13, minimumAddend: 1 },
  hard: { minimumTotal: 10, maximumTotal: 15, minimumAddend: 2 },
};

export function generateAdditionQuestion(random?: Random): AdditionQuestion;
export function generateAdditionQuestion(
  difficulty: ChallengeDifficulty,
  random?: Random,
): AdditionQuestion;
export function generateAdditionQuestion(
  difficultyOrRandom: ChallengeDifficulty | Random = "normal",
  providedRandom: Random = Math.random,
): AdditionQuestion {
  const random = typeof difficultyOrRandom === "function" ? difficultyOrRandom : providedRandom;
  const difficulty = typeof difficultyOrRandom === "function" ? "normal" : difficultyOrRandom;
  const range = ranges[difficulty];
  const total = range.minimumTotal + Math.floor(random() * (range.maximumTotal - range.minimumTotal + 1));
  const left = range.minimumAddend + Math.floor(random() * (total - range.minimumAddend * 2 + 1));

  return { left, right: total - left, total };
}
