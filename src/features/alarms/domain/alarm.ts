import { z } from "zod";

export const repeatDaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
export const challengeDifficultySchema = z.enum(["easy", "normal", "hard"]);
export const challengeTypeSchema = z.enum(["shape-photo", "quick-addition", "connect-dots"]);
export const additionQuestionCountSchema = z.number().int().min(1).max(8).default(3);

export const alarmSchema = z.object({
  id: z.string().min(1), label: z.string().trim().max(80), hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59), enabled: z.boolean(), repeatDays: z.array(repeatDaySchema),
  vibrationEnabled: z.boolean(), challengeType: challengeTypeSchema, challengeDifficulty: challengeDifficultySchema,
  targetShapeId: z.string().min(1), additionQuestionCount: additionQuestionCountSchema,
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
export type RepeatDay = z.infer<typeof repeatDaySchema>;
export type ChallengeDifficulty = z.infer<typeof challengeDifficultySchema>;
export type ChallengeType = z.infer<typeof challengeTypeSchema>;
export type Alarm = z.infer<typeof alarmSchema>;
export type AlarmDraft = Omit<Alarm, "id" | "createdAt" | "updatedAt" | "additionQuestionCount"> & {
  additionQuestionCount?: number;
};

export const challengeTypeLabels: Record<ChallengeType, string> = {
  "shape-photo": "Shape photo challenge",
  "quick-addition": "Quick addition challenge",
  "connect-dots": "Connect the dots challenge",
};
