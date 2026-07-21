import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ShapeDetectionResult } from "../domain/ShapeDetectionResult";
import { failureMessages } from "../domain/ShapeDetectionResult";
import { colors } from "@/theme/colors";
export function DetectionResultScreen({
  result,
  attemptCount,
  onTryAgain,
}: {
  result: ShapeDetectionResult;
  attemptCount: number;
  onTryAgain(): void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {result.accepted
          ? "Shape accepted. Alarm dismissed."
          : failureMessages[result.failureReason ?? "shape-does-not-match"]}
      </Text>
      <Text>Confidence: {Math.round(result.confidence * 100)}%</Text>
      <Text>Attempts: {attemptCount}</Text>
      {!result.accepted ? (
        <Pressable style={styles.button} onPress={onTryAgain}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: colors.surface, fontWeight: "700" },
});
