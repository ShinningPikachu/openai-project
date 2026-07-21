import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { Alarm } from "@/features/alarms/domain/alarm";
import { alarmNativeActions } from "@/platform/alarmScheduler";
import { analyzeCapturedImage } from "../application/analyzeCapturedImage";
import {
  ActiveAlarmMismatchError,
  completeAcceptedChallenge,
} from "../application/completeChallenge";
import { retryChallenge } from "../application/retryChallenge";
import { startCameraChallenge } from "../application/startCameraChallenge";
import { CameraUnavailableError } from "../domain/ChallengeErrors";
import { transitionChallenge } from "../domain/ChallengeSession";
import type { ChallengeSession } from "../domain/ChallengeSession";
import type { ShapeDetectionResult } from "../domain/ShapeDetectionResult";
import { AndroidCameraChallengeService } from "../infrastructure/camera/NativeCameraChallengeService";
import { StaticShapeTargetRegistry } from "../infrastructure/shape-detection/ShapeTargetRegistry";
import { ChallengeInstructions } from "./ChallengeInstructions";
import { DetectionResultScreen } from "./DetectionResultScreen";
import { ShapeOverlay } from "./ShapeOverlay";

const unavailableMessage =
  "The native camera challenge is unavailable in this build. Use a development build installed with expo run:android so the alarm challenge module is included.";

const isCameraUnavailable = (cause: unknown) =>
  cause instanceof CameraUnavailableError;

export function CameraChallengeScreen({
  alarm,
  onCompleted,
}: {
  alarm: Alarm;
  onCompleted(): void;
}) {
  const service = useMemo(() => new AndroidCameraChallengeService(), []);
  const targetRegistry = useMemo(() => new StaticShapeTargetRegistry(), []);
  const target = useMemo(
    () =>
      targetRegistry.getById(alarm.targetShapeId) ??
      targetRegistry.getById("circle")!,
    [alarm.targetShapeId, targetRegistry],
  );
  const [session, setSessionState] = useState<ChallengeSession>(() =>
    startCameraChallenge(alarm.id, target.id),
  );
  const sessionRef = useRef(session);
  const setSession = (
    next: ChallengeSession | ((current: ChallengeSession) => ChallengeSession),
  ) =>
    setSessionState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      sessionRef.current = resolved;
      return resolved;
    });
  const [permission, setPermission] = useState("unknown");
  const [result, setResult] = useState<ShapeDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  const handleCameraError = useCallback((cause: unknown) => {
    if (isCameraUnavailable(cause)) {
      setCameraUnavailable(true);
      setError(unavailableMessage);
    } else if (cause instanceof ActiveAlarmMismatchError) {
      setError(
        "This challenge is no longer tied to a ringing alarm. Return to the active alarm and try again.",
      );
    } else {
      console.error(cause);
      setError(
        "Camera capture or local analysis failed. The alarm is still active.",
      );
    }
    setSession((current) => transitionChallenge(current, "failed"));
  }, []);

  useEffect(() => {
    try {
      service.setDebugMode?.(__DEV__);
    } catch (cause) {
      handleCameraError(cause);
      return;
    }
    void service.cleanupTemporaryImages().catch(handleCameraError);
    void service
      .getPermissionStatus()
      .then((status) => {
        setPermission(status);
        setSession((current) =>
          transitionChallenge(
            current,
            status === "granted" ? "camera-ready" : "preparing-camera",
          ),
        );
      })
      .catch(handleCameraError);
  }, [handleCameraError, service]);

  const requestPermission = async () => {
    try {
      setError(null);
      setSession((current) => transitionChallenge(current, "preparing-camera"));
      const status = await service.requestPermission();
      setPermission(status);
      setSession((current) =>
        transitionChallenge(
          current,
          status === "granted" ? "camera-ready" : "failed",
        ),
      );
    } catch (cause) {
      handleCameraError(cause);
    }
  };

  const openSettings = async () => {
    try {
      await service.openAppSettings();
    } catch (cause) {
      handleCameraError(cause);
    }
  };

  const capture = async () => {
    try {
      setError(null);
      setResult(null);
      setSession((current) => transitionChallenge(current, "processing"));
      const response = await analyzeCapturedImage(
        service,
        target.id,
        alarm.challengeDifficulty,
      );
      if (response.result.accepted) {
        const accepted = transitionChallenge(
          sessionRef.current,
          "accepted",
          response.result,
        );
        await completeAcceptedChallenge(accepted, response.result);
        setSession(accepted);
        onCompleted();
      } else {
        setResult(response.result);
        setSession((current) =>
          transitionChallenge(current, "rejected", response.result),
        );
      }
    } catch (cause) {
      handleCameraError(cause);
    }
  };

  const emergency = () =>
    Alert.alert(
      "Emergency override",
      "Use this only if the camera challenge cannot be completed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop alarm",
          style: "destructive",
          onPress: () =>
            void alarmNativeActions
              .stopActiveAlarm(alarm.id, "emergency-override")
              .then(onCompleted)
              .catch(handleCameraError),
        },
      ],
    );

  if (result && !result.accepted)
    return (
      <DetectionResultScreen
        result={result}
        attemptCount={session.attemptCount}
        onTryAgain={() => {
          setResult(null);
          setSession(retryChallenge(sessionRef.current));
        }}
        onEmergencyOverride={emergency}
      />
    );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{alarm.label || "Alarm"}</Text>
      <Text style={styles.target}>{target.name}</Text>
      <ChallengeInstructions targetName={target.name} />
      <ShapeOverlay targetShapeId={target.id} />
      {permission !== "granted" ? (
        <View style={styles.card}>
          <Text>
            {cameraUnavailable
              ? unavailableMessage
              : "Camera access is required to analyze an object and complete the alarm challenge. Shape data is processed locally and is not uploaded."}
          </Text>
          <Pressable
            style={[styles.button, cameraUnavailable && styles.disabled]}
            disabled={cameraUnavailable}
            onPress={() => void requestPermission()}
          >
            <Text style={styles.buttonText}>Allow camera</Text>
          </Pressable>
          <Pressable
            disabled={cameraUnavailable}
            onPress={() => void openSettings()}
          >
            <Text
              style={[styles.link, cameraUnavailable && styles.disabledText]}
            >
              Open app settings
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          disabled={session.status === "processing" || cameraUnavailable}
          accessibilityLabel={`Open automatic shape camera for ${target.name}`}
          style={[styles.capture, cameraUnavailable && styles.disabled]}
          onPress={() => void capture()}
        >
          <Text style={styles.buttonText}>
            {session.status === "processing"
              ? "Processing…"
              : "Open automatic shape camera"}
          </Text>
        </Pressable>
      )}
      <Text>Attempt {session.attemptCount}</Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable onPress={emergency}>
        <Text style={styles.emergency}>Emergency override</Text>
      </Pressable>
      {__DEV__ ? <Text>State: {session.status}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 16 },
  label: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  target: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  card: { gap: 12, padding: 16, backgroundColor: "#fff", borderRadius: 12 },
  button: {
    backgroundColor: "#1d4ed8",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  capture: {
    backgroundColor: "#16a34a",
    padding: 18,
    borderRadius: 999,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  disabledText: { opacity: 0.6 },
  link: { color: "#1d4ed8", fontWeight: "700", textAlign: "center" },
  error: { color: "#dc2626", fontWeight: "700" },
  emergency: { color: "#dc2626", fontWeight: "700", textAlign: "center" },
});
