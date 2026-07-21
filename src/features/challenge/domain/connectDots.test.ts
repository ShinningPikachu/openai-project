import { describe, expect, it } from "vitest";
import { generateConnectDotsPattern } from "./connectDots";

describe("connect the dots patterns", () => {
  it("generates a complete ordered pattern within the board", () => {
    const pattern = generateConnectDotsPattern(() => 0.75);

    expect(pattern.points).toHaveLength(6);
    pattern.points.forEach((point) => {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(1);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(1);
    });
  });
});
