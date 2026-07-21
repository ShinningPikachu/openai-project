import { createChallengeSession } from "../domain/ChallengeSession";

export const startCameraChallenge = (alarmId: string, targetShapeId = "circle") =>
  createChallengeSession(alarmId, targetShapeId);
