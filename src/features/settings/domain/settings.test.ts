import { describe, expect, it } from "vitest";
import { appSettingsSchema } from "./settings";
describe("settings validation", () => { it("rejects unsupported theme", () => expect(() => appSettingsSchema.parse({ defaultVibrationEnabled: true, defaultChallengeDifficulty: "normal", emergencyOverrideEnabled: false, theme: "blue" })).toThrow()); });
