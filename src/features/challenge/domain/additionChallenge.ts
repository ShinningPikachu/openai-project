import type { ChallengeDifficulty } from "@/features/alarms/domain/alarm";

export interface AdditionQuestion {
  left: number;
  right: number;
  total: number;
  options: readonly number[];
}

type Random = () => number;

const ranges: Record<
  ChallengeDifficulty,
  { minimumTotal: number; maximumTotal: number; minimumAddend: number }
> = {
  easy: { minimumTotal: 6, maximumTotal: 10, minimumAddend: 1 },
  normal: { minimumTotal: 7, maximumTotal: 13, minimumAddend: 1 },
  hard: { minimumTotal: 10, maximumTotal: 15, minimumAddend: 2 },
};

const answerOffsets = [-3, -2, -1, 1, 2, 3, 4];

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

const generateAnswerOptions = (total: number, random: Random): number[] => {
  const incorrectAnswers = shuffle(answerOffsets, random)
    .map((offset) => total + offset)
    .filter((option) => option > 0)
    .slice(0, 3);

  return shuffle([total, ...incorrectAnswers], random);
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
  const random =
    typeof difficultyOrRandom === "function"
      ? difficultyOrRandom
      : providedRandom;
  const difficulty =
    typeof difficultyOrRandom === "function" ? "normal" : difficultyOrRandom;
  const range = ranges[difficulty];
  const total =
    range.minimumTotal +
    Math.floor(random() * (range.maximumTotal - range.minimumTotal + 1));
  const left =
    range.minimumAddend +
    Math.floor(random() * (total - range.minimumAddend * 2 + 1));

  return {
    left,
    right: total - left,
    total,
    options: generateAnswerOptions(total, random),
  };
}
