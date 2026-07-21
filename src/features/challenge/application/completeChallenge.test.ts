import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChallengeSession, transitionChallenge } from "../domain/ChallengeSession";
import {
  ActiveAlarmMismatchError,
  completeAcceptedChallenge,
  createShapeSuccessCompletion,
} from "./completeChallenge";

const nativeActions = vi.hoisted(() => ({
  getActiveAlarm: vi.fn(),
  stopActiveAlarm: vi.fn(),
}));

vi.mock("@/platform/alarmScheduler", () => ({
  alarmNativeActions: nativeActions,
}));

const acceptedResult = {
  accepted: true,
  confidence: 0.9,
  targetShapeId: "circle",
  processingDurationMs: 123,
};

const session = () =>
  transitionChallenge(
    createChallengeSession("alarm-1", "circle", new Date("2026-01-01T00:00:00Z")),
    "processing",
  );

describe("completion history", () => {
  beforeEach(() => {
    nativeActions.getActiveAlarm.mockReset();
    nativeActions.stopActiveAlarm.mockReset();
  });

  it("creates shape success completion without image storage", () => {
    const completion = createShapeSuccessCompletion(
      session(),
      "2026-01-01T00:00:00Z",
      acceptedResult,
      new Date("2026-01-01T00:01:00Z"),
    );

    expect(completion).toMatchObject({
      alarmId: "alarm-1",
      completionType: "shape-success",
      targetShapeId: "circle",
      confidence: 0.9,
      attempts: 1,
      processingDurationMs: 123,
    });
    expect(JSON.stringify(completion)).not.toContain("uri");
  });

  it("treats an accepted manual challenge as a preview", async () => {
    nativeActions.getActiveAlarm.mockResolvedValue(null);

    await expect(completeAcceptedChallenge(session(), acceptedResult)).resolves.toBeNull();
    expect(nativeActions.stopActiveAlarm).not.toHaveBeenCalled();
  });

  it("never stops a different active alarm", async () => {
    nativeActions.getActiveAlarm.mockResolvedValue({
      alarmId: "alarm-2",
      label: "Other alarm",
      triggeredAt: "2026-01-01T00:00:00Z",
      status: "ringing",
    });

    await expect(completeAcceptedChallenge(session(), acceptedResult)).rejects.toBeInstanceOf(
      ActiveAlarmMismatchError,
    );
    expect(nativeActions.stopActiveAlarm).not.toHaveBeenCalled();
  });

  it("does not stop a dismissed alarm record", async () => {
    nativeActions.getActiveAlarm.mockResolvedValue({
      alarmId: "alarm-1",
      label: "Alarm",
      triggeredAt: "2026-01-01T00:00:00Z",
      status: "dismissed",
    });

    await expect(completeAcceptedChallenge(session(), acceptedResult)).rejects.toBeInstanceOf(
      ActiveAlarmMismatchError,
    );
    expect(nativeActions.stopActiveAlarm).not.toHaveBeenCalled();
  });

  it("reports an alarm that changes while stopping as a mismatch", async () => {
    nativeActions.getActiveAlarm.mockResolvedValue({
      alarmId: "alarm-1",
      label: "Alarm",
      triggeredAt: "2026-01-01T00:00:00Z",
      status: "ringing",
    });
    nativeActions.stopActiveAlarm.mockRejectedValue({
      code: "ACTIVE_ALARM_MISMATCH",
    });

    await expect(completeAcceptedChallenge(session(), acceptedResult)).rejects.toBeInstanceOf(
      ActiveAlarmMismatchError,
    );
  });

  it("stops only the matching ringing alarm", async () => {
    nativeActions.getActiveAlarm.mockResolvedValue({
      alarmId: "alarm-1",
      label: "Alarm",
      triggeredAt: "2026-01-01T00:00:00Z",
      status: "ringing",
    });

    await completeAcceptedChallenge(session(), acceptedResult);
    expect(nativeActions.stopActiveAlarm).toHaveBeenCalledWith("alarm-1", "shape-success");
  });
});
