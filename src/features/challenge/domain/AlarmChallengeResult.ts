export interface AlarmChallengeResult {
  accepted: boolean;
  confidence: number;
  processingDurationMs: number;
  targetShapeId?: string;
}
