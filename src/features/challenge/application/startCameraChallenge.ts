import { createChallengeSession } from "../domain/ChallengeSession";
export const startCameraChallenge = (alarmId: string, targetShapeId = "elongated") => createChallengeSession(alarmId, targetShapeId);
