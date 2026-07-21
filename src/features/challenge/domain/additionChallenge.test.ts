import { describe, expect, it } from "vitest";
import { generateAdditionQuestion } from "./additionChallenge";

describe("addition challenge questions", () => {
  it("generates unambiguous positive sums around ten", () => {
    const question = generateAdditionQuestion(() => 0.5);

    expect(question.left).toBeGreaterThan(0);
    expect(question.right).toBeGreaterThan(0);
    expect(question.total).toBeGreaterThanOrEqual(7);
    expect(question.total).toBeLessThanOrEqual(13);
    expect(question.left + question.right).toBe(question.total);
  });
});
