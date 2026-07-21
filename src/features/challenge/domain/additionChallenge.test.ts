import { describe, expect, it } from "vitest";
import { generateAdditionQuestion } from "./additionChallenge";

describe("addition challenge questions", () => {
  it.each([
    ["easy", 6, 10],
    ["normal", 7, 13],
    ["hard", 10, 15],
  ] as const)("generates %s unambiguous positive sums", (difficulty, minimum, maximum) => {
    const question = generateAdditionQuestion(difficulty, () => 0.5);

    expect(question.left).toBeGreaterThan(0);
    expect(question.right).toBeGreaterThan(0);
    expect(question.total).toBeGreaterThanOrEqual(minimum);
    expect(question.total).toBeLessThanOrEqual(maximum);
    expect(question.left + question.right).toBe(question.total);
  });
});
