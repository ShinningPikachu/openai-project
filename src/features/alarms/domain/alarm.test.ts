import { describe, expect, it } from "vitest";
import { alarmSchema } from "./alarm";
const valid = { id: "a", label: " Wake ", hour: 7, minute: 0, enabled: true, repeatDays: [], vibrationEnabled: true, challengeType: "shape-photo", challengeDifficulty: "normal", targetShapeId: "circle", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" };
describe("alarm validation", () => { it("rejects invalid times", () => expect(() => alarmSchema.parse({ ...valid, hour: 24 })).toThrow()); it("trims labels", () => expect(alarmSchema.parse(valid).label).toBe("Wake")); });
