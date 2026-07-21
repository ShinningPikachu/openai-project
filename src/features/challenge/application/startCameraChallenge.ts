import { createChallengeSession } from "../domain/ChallengeSession";

export const startAlarmChallenge = (alarmId: string, targetShapeId = "circle") =>
  createChallengeSession(alarmId, targetShapeId);

export const startCameraChallenge = startAlarmChallenge;
