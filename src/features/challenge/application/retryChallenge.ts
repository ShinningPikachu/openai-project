import { transitionChallenge, type ChallengeSession } from "../domain/ChallengeSession";
export const retryChallenge = (session: ChallengeSession) => transitionChallenge(session, "camera-ready");
