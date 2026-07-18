import { z } from "zod";
import { challengeDifficultySchema } from "@/features/alarms/domain/alarm";
export const appSettingsSchema = z.object({
  defaultVibrationEnabled: z.boolean(), defaultChallengeDifficulty: challengeDifficultySchema,
  emergencyOverrideEnabled: z.boolean(), theme: z.enum(["system", "light", "dark"]),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;
export const defaultSettings: AppSettings = { defaultVibrationEnabled: true, defaultChallengeDifficulty: "normal", emergencyOverrideEnabled: false, theme: "system" };
