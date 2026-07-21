import { transitionChallenge, type ChallengeSession } from "../domain/ChallengeSession";
export const retryAlarmChallenge = (session: ChallengeSession) => transitionChallenge(session, "camera-ready");
export const retryChallenge = retryAlarmChallenge;
