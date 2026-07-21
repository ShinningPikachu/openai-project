import { describe, expect, it } from "vitest";
import { generateConnectDotsPattern } from "./connectDots";

describe("connect the dots patterns", () => {
  it.each([
    ["easy", 6],
    ["normal", 8],
    ["hard", 10],
  ] as const)("generates %s patterns with %i well-spaced dots", (difficulty, pointCount) => {
    const pattern = generateConnectDotsPattern(difficulty, () => 0.75);

    expect(pattern.points).toHaveLength(pointCount);
    pattern.points.forEach((point) => {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(1);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(1);
    });

    pattern.points.forEach((point, index) => {
      pattern.points.slice(index + 1).forEach((other) => {
        expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeGreaterThan(0.15);
      });
    });
  });
});
