import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { analyzeCapturedImage } from "../application/analyzeCapturedImage";
import { CameraUnavailableError } from "../domain/ChallengeErrors";
import type { ShapeDetectionResult } from "../domain/ShapeDetectionResult";
import { AndroidCameraChallengeService } from "../infrastructure/camera/NativeCameraChallengeService";
import { StaticShapeTargetRegistry } from "../infrastructure/shape-detection/ShapeTargetRegistry";
import type { AlarmChallengeViewProps } from "./AlarmChallengeView";
import { ChallengeInstructions } from "./ChallengeInstructions";
import { DetectionResultScreen } from "./DetectionResultScreen";
import { ShapeOverlay } from "./ShapeOverlay";

const unavailableMessage =
  "The native camera challenge is unavailable in this build. Install an Android build with the camera challenge included.";

export function CameraChallengeScreen({
  alarm,
  session,
  onAccepted,
  onError,
  onRetry,
  onSessionTransition,
}: AlarmChallengeViewProps) {
  const service = useMemo(() => new AndroidCameraChallengeService(), []);
  const targetRegistry = useMemo(() => new StaticShapeTargetRegistry(), []);
  const target = useMemo(
    () => targetRegistry.getById(alarm.targetShapeId) ?? targetRegistry.getById("circle")!,
    [alarm.targetShapeId, targetRegistry],
  );
  const [permission, setPermission] = useState("unknown");
  const [result, setResult] = useState<ShapeDetectionResult | null>(null);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  const handleCameraError = useCallback((cause: unknown) => {
    if (cause instanceof CameraUnavailableError) {
      setCameraUnavailable(true);
      onError(unavailableMessage);
      return;
    }
    onError("Camera capture or local analysis failed. The alarm is still active.", cause);
  }, [onError]);

  useEffect(() => {
    void service.getPermissionStatus().then((status) => {
      setPermission(status);
      onSessionTransition(status === "granted" ? "camera-ready" : "preparing-camera");
    }).catch(handleCameraError);
  }, [handleCameraError, onSessionTransition, service]);

  const requestPermission = async () => {
    try {
      onSessionTransition("preparing-camera");
      const status = await service.requestPermission();
      setPermission(status);
      onSessionTransition(status === "granted" ? "camera-ready" : "failed");
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
      setResult(null);
      onSessionTransition("processing");
      const response = await analyzeCapturedImage(service, target.id, alarm.challengeDifficulty);
      if (response.result.accepted) {
        await onAccepted(response.result);
      } else {
        setResult(response.result);
        onSessionTransition("rejected", response.result);
      }
    } catch (cause) {
      handleCameraError(cause);
    }
  };

  if (result && !result.accepted) {
    return <DetectionResultScreen result={result} attemptCount={session.attemptCount} onTryAgain={() => {
      setResult(null);
      onRetry();
    }} />;
  }

  return (
    <View style={styles.container}>
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
          <Pressable style={[styles.button, cameraUnavailable && styles.disabled]} disabled={cameraUnavailable} onPress={() => void requestPermission()}>
            <Text style={styles.buttonText}>Allow camera</Text>
          </Pressable>
          <Pressable disabled={cameraUnavailable} onPress={() => void openSettings()}>
            <Text style={[styles.link, cameraUnavailable && styles.disabledText]}>Open app settings</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          disabled={session.status === "processing" || cameraUnavailable}
          accessibilityLabel={`Open automatic shape camera for ${target.name}`}
          style={[styles.capture, cameraUnavailable && styles.disabled]}
          onPress={() => void capture()}
        >
          <Text style={styles.buttonText}>{session.status === "processing" ? "Processing…" : "Open automatic shape camera"}</Text>
        </Pressable>
      )}
      <Text>Attempt {session.attemptCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  target: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  card: { gap: 12, padding: 16, backgroundColor: "#fff", borderRadius: 12 },
  button: { backgroundColor: "#1d4ed8", padding: 14, borderRadius: 10, alignItems: "center" },
  capture: { backgroundColor: "#16a34a", padding: 18, borderRadius: 999, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  disabledText: { opacity: 0.6 },
  link: { color: "#1d4ed8", fontWeight: "700", textAlign: "center" },
});
