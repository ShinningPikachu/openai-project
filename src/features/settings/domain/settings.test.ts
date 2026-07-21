import { describe, expect, it } from "vitest";
import { appSettingsSchema } from "./settings";
describe("settings validation", () => { it("rejects unsupported default difficulty", () => expect(() => appSettingsSchema.parse({ defaultVibrationEnabled: true, defaultChallengeDifficulty: "advanced", emergencyOverrideEnabled: false })).toThrow()); });
