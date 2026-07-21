import type { ChallengeSession } from "../domain/ChallengeSession";
import type { ShapeDetectionResult } from "../domain/ShapeDetectionResult";
import { alarmNativeActions } from "@/platform/alarmScheduler";

export class ActiveAlarmMismatchError extends Error {
  name = "ActiveAlarmMismatchError";

  constructor() {
    super("Challenge alarm does not match the active native alarm.");
  }
}

const isActiveAlarmMismatch = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "ACTIVE_ALARM_MISMATCH",
  );

export interface AlarmCompletion { id: string; alarmId: string; triggeredAt: string; completedAt: string; completionType: "shape-success" | "emergency-override" | "system-error"; targetShapeId?: string; confidence?: number; attempts: number; processingDurationMs?: number; }
export function createShapeSuccessCompletion(session: ChallengeSession, triggeredAt: string, result: ShapeDetectionResult, now = new Date()): AlarmCompletion { return { id: `${session.id}-completion`, alarmId: session.alarmId, triggeredAt, completedAt: now.toISOString(), completionType: "shape-success", targetShapeId: result.targetShapeId, confidence: result.confidence, attempts: session.attemptCount, processingDurationMs: result.processingDurationMs }; }
export async function completeAcceptedChallenge(session: ChallengeSession, result: ShapeDetectionResult): Promise<AlarmCompletion | null> {
  if (!result.accepted) throw new Error("Rejected challenge results cannot stop an alarm.");
  const active = await alarmNativeActions.getActiveAlarm();
  if (!active) return null;
  if (active.status !== "ringing" || active.alarmId !== session.alarmId) {
    throw new ActiveAlarmMismatchError();
  }
  const completion = createShapeSuccessCompletion(session, active.triggeredAt, result);
  try {
    await alarmNativeActions.stopActiveAlarm(session.alarmId, "shape-success");
  } catch (error) {
    if (isActiveAlarmMismatch(error)) throw new ActiveAlarmMismatchError();
    throw error;
  }
  return completion;
}
