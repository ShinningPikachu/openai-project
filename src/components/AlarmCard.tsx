import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  challengeTypeLabels,
  type Alarm,
} from "@/features/alarms/domain/alarm";
import { getNextAlarmOccurrence } from "@/features/alarms/domain/nextOccurrence";
import { colors } from "@/theme/colors";
import { formatRepeatDays, formatTime } from "@/utilities/format";

export function AlarmCard({
  alarm,
  isRinging = false,
  onToggle,
  onEdit,
  onOpenChallenge,
  onDelete,
}: {
  alarm: Alarm;
  isRinging?: boolean;
  onToggle(enabled: boolean): void;
  onEdit(): void;
  onOpenChallenge(): void;
  onDelete(): void;
}) {
  const next = getNextAlarmOccurrence(alarm);
  const status = isRinging
    ? "Ringing"
    : alarm.enabled
    ? next
      ? "Scheduled"
      : "Scheduling failed"
    : "Off";

  return (
    <View style={[styles.card, isRinging && styles.ringingCard]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isRinging
            ? `Open challenge for ${alarm.label || "alarm"}`
            : `Edit ${alarm.label || "alarm"}`
        }
        onPress={isRinging ? onOpenChallenge : onEdit}
        style={styles.main}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.time, isRinging && styles.ringingTime]}>
            {formatTime(alarm.hour, alarm.minute)}
          </Text>
          <Text numberOfLines={1} style={styles.label}>
            {alarm.label || "Alarm"}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.detail}>
          {formatRepeatDays(alarm.repeatDays)} ·{" "}
          {challengeTypeLabels[alarm.challengeType]} · {status}
        </Text>
        {isRinging ? (
          <Text style={styles.ringingHint}>Tap to open the challenge</Text>
        ) : null}
      </Pressable>
      <View style={styles.actions}>
        <Switch
          value={alarm.enabled}
          onValueChange={onToggle}
          accessibilityLabel="Enable alarm"
        />
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${alarm.label || "alarm"}`}
        >
          <Text style={styles.delete}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  ringingCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 2,
  },
  main: { flex: 1, gap: 3 },
  titleRow: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  time: { color: colors.text, fontSize: 30, fontWeight: "800" },
  ringingTime: { color: colors.danger },
  label: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "700" },
  detail: { color: colors.textMuted, fontSize: 13 },
  ringingHint: { color: colors.danger, fontSize: 13, fontWeight: "800" },
  actions: { alignItems: "flex-end", gap: 2 },
  delete: { color: colors.danger, fontSize: 13, fontWeight: "700", padding: 4 },
});
