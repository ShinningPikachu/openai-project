import { describe, expect, it } from "vitest";
import { formatWheelValue, wrapWheelValue } from "./timeWheelValue";

describe("time wheel values", () => {
  it("formats 24-hour values with leading zeroes", () => {
    expect(formatWheelValue(0)).toBe("00");
    expect(formatWheelValue(7)).toBe("07");
    expect(formatWheelValue(23)).toBe("23");
  });

  it("cycles without producing invalid values", () => {
    expect(wrapWheelValue(-1, 24)).toBe(23);
    expect(wrapWheelValue(24, 24)).toBe(0);
    expect(wrapWheelValue(60, 60)).toBe(0);
  });
});
