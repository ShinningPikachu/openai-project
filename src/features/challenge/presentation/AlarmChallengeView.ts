import type { Alarm } from "@/features/alarms/domain/alarm";
import type { ChallengeStatus, ChallengeSession } from "../domain/ChallengeSession";
import type { AlarmChallengeResult } from "../domain/AlarmChallengeResult";

export interface AlarmChallengeViewProps {
  alarm: Alarm;
  session: ChallengeSession;
  onSessionTransition(status: ChallengeStatus, result?: AlarmChallengeResult): void;
  onAccepted(result: AlarmChallengeResult): Promise<void>;
  onRetry(): void;
  onError(message: string, cause?: unknown): void;
}
