import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  challengeTypeLabels,
  type Alarm,
} from "@/features/alarms/domain/alarm";
import { alarmNativeActions } from "@/platform/alarmScheduler";
import {
  ActiveAlarmMismatchError,
  completeAcceptedChallenge,
} from "../application/completeChallenge";
import { retryAlarmChallenge } from "../application/retryChallenge";
import { startAlarmChallenge } from "../application/startCameraChallenge";
import type { AlarmChallengeResult } from "../domain/AlarmChallengeResult";
import {
  transitionChallenge,
  type ChallengeStatus,
  type ChallengeSession,
} from "../domain/ChallengeSession";
import { CameraChallengeScreen } from "./CameraChallengeScreen";
import { ConnectDotsChallenge } from "./ConnectDotsChallenge";
import { QuickAdditionChallenge } from "./QuickAdditionChallenge";
import { colors } from "@/theme/colors";

const activeAlarmMismatchMessage =
  "This challenge is no longer tied to a ringing alarm. Return to the active alarm and try again.";

const isActiveAlarmMismatch = (cause: unknown) =>
  cause instanceof ActiveAlarmMismatchError ||
  Boolean(
    cause &&
    typeof cause === "object" &&
    (cause as { code?: unknown }).code === "ACTIVE_ALARM_MISMATCH",
  );

export function AlarmChallengeScreen({
  alarm,
  onCompleted,
  emergencyOverrideEnabled = false,
  testMode = false,
}: {
  alarm: Alarm;
  onCompleted(): void;
  emergencyOverrideEnabled?: boolean;
  testMode?: boolean;
}) {
  const [session, setSessionState] = useState<ChallengeSession>(() =>
    startAlarmChallenge(alarm.id, alarm.targetShapeId),
  );
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef(session);
  const setSession = useCallback(
    (
      next:
        ChallengeSession | ((current: ChallengeSession) => ChallengeSession),
    ) => {
      const resolved =
        typeof next === "function" ? next(sessionRef.current) : next;
      sessionRef.current = resolved;
      setSessionState(resolved);
    },
    [],
  );

  const onSessionTransition = useCallback(
    (status: ChallengeStatus, result?: AlarmChallengeResult) => {
      setSession((current) => transitionChallenge(current, status, result));
    },
    [setSession],
  );

  const onError = useCallback(
    (message: string, cause?: unknown) => {
      if (cause) console.error("Alarm challenge failed.", cause);
      setError(message);
      setSession((current) => transitionChallenge(current, "failed"));
    },
    [setSession],
  );

  const onAccepted = useCallback(
    async (result: AlarmChallengeResult) => {
      const accepted = transitionChallenge(
        sessionRef.current,
        "accepted",
        result,
      );
      if (testMode) {
        setSession(accepted);
        onCompleted();
        return;
      }
      try {
        await completeAcceptedChallenge(accepted, result);
        setSession(accepted);
        onCompleted();
      } catch (cause) {
        const activeAlarmMismatch = isActiveAlarmMismatch(cause);
        onError(
          activeAlarmMismatch
            ? activeAlarmMismatchMessage
            : "The challenge was completed, but the alarm is still active. Please try again.",
          activeAlarmMismatch ? undefined : cause,
        );
      }
    },
    [onCompleted, onError, setSession, testMode],
  );

  const onRetry = useCallback(() => {
    setError(null);
    setSession(retryAlarmChallenge(sessionRef.current));
  }, [setSession]);

  const onEmergencyOverride = useCallback(() => {
    Alert.alert(
      "Emergency override",
      "Use this only if the alarm challenge cannot be completed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop alarm",
          style: "destructive",
          onPress: () =>
            void alarmNativeActions
              .stopActiveAlarm(alarm.id, "emergency-override")
              .then(onCompleted)
              .catch((cause) => {
                const activeAlarmMismatch = isActiveAlarmMismatch(cause);
                onError(
                  activeAlarmMismatch
                    ? activeAlarmMismatchMessage
                    : "The alarm could not be stopped. It is still active.",
                  activeAlarmMismatch ? undefined : cause,
                );
              }),
        },
      ],
    );
  }, [alarm.id, onCompleted, onError]);

  const challengeProps = {
    alarm,
    session,
    onSessionTransition,
    onAccepted,
    onRetry,
    onError,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{alarm.label || "Alarm"}</Text>
      <Text style={styles.type}>
        {challengeTypeLabels[alarm.challengeType]}
      </Text>
      {alarm.challengeType === "shape-photo" ? (
        <CameraChallengeScreen {...challengeProps} />
      ) : null}
      {alarm.challengeType === "quick-addition" ? (
        <QuickAdditionChallenge {...challengeProps} />
      ) : null}
      {alarm.challengeType === "connect-dots" ? (
        <ConnectDotsChallenge {...challengeProps} />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {emergencyOverrideEnabled ? (
        <Pressable onPress={onEmergencyOverride} accessibilityRole="button">
          <Text style={styles.emergency}>Emergency override</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  label: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  type: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  error: { color: colors.danger, fontWeight: "700", textAlign: "center" },
  emergency: { color: colors.danger, fontWeight: "700", textAlign: "center" },
});
