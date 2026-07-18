import { describe, expect, it } from "vitest";
import { formatRepeatDays, formatTime } from "./format";
describe("formatTime", () => { it("pads hour and minute", () => expect(formatTime(7, 5)).toBe("07:05")); });
describe("formatRepeatDays", () => { it("formats one-time and selected schedules", () => { expect(formatRepeatDays([])).toBe("Once"); expect(formatRepeatDays(["monday", "friday"])).toBe("Mon, Fri"); }); });
