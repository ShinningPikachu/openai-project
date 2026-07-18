import { describe, expect, it } from "vitest";
import type { Alarm } from "./alarm";
import { getNextAlarmOccurrence } from "./nextOccurrence";
const base: Alarm = { id: "a", label: "Wake", hour: 7, minute: 30, enabled: true, repeatDays: [], vibrationEnabled: true, challengeType: "shape-photo", challengeDifficulty: "normal", targetShapeId: "elongated", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const iso = (d: Date | null) => d?.toISOString();
describe("getNextAlarmOccurrence", () => {
  it("schedules later today", () => expect(iso(getNextAlarmOccurrence(base, new Date(2026, 6, 18, 7, 0)))).toBe(new Date(2026, 6, 18, 7, 30).toISOString()));
  it("schedules tomorrow after the time passed", () => expect(iso(getNextAlarmOccurrence(base, new Date(2026, 6, 18, 8, 0)))).toBe(new Date(2026, 6, 19, 7, 30).toISOString()));
  it("returns null for disabled alarms", () => expect(getNextAlarmOccurrence({ ...base, enabled: false }, new Date())).toBeNull());
  it("handles weekday recurrence", () => expect(iso(getNextAlarmOccurrence({ ...base, repeatDays: ["monday", "wednesday"] }, new Date(2026, 6, 20, 7, 0)))).toBe(new Date(2026, 6, 20, 7, 30).toISOString()));
  it("handles weekend recurrence", () => expect(iso(getNextAlarmOccurrence({ ...base, repeatDays: ["saturday", "sunday"] }, new Date(2026, 6, 20, 8, 0)))).toBe(new Date(2026, 6, 25, 7, 30).toISOString()));
  it("handles Sunday to Monday transition", () => expect(iso(getNextAlarmOccurrence({ ...base, repeatDays: ["monday"] }, new Date(2026, 6, 19, 8, 0)))).toBe(new Date(2026, 6, 20, 7, 30).toISOString()));
  it("handles month boundary", () => expect(iso(getNextAlarmOccurrence(base, new Date(2026, 0, 31, 8, 0)))).toBe(new Date(2026, 1, 1, 7, 30).toISOString()));
  it("handles year boundary", () => expect(iso(getNextAlarmOccurrence(base, new Date(2026, 11, 31, 8, 0)))).toBe(new Date(2027, 0, 1, 7, 30).toISOString()));
});
