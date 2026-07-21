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
  onToggle,
  onEdit,
  onDelete,
}: {
  alarm: Alarm;
  onToggle(enabled: boolean): void;
  onEdit(): void;
  onDelete(): void;
}) {
  const next = getNextAlarmOccurrence(alarm);
  const status = alarm.enabled
    ? next
      ? "Scheduled"
      : "Scheduling failed"
    : "Off";

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${alarm.label || "alarm"}`}
        onPress={onEdit}
        style={styles.main}
      >
        <View style={styles.titleRow}>
          <Text style={styles.time}>
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
  main: { flex: 1, gap: 3 },
  titleRow: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  time: { color: colors.text, fontSize: 30, fontWeight: "800" },
  label: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "700" },
  detail: { color: colors.textMuted, fontSize: 13 },
  actions: { alignItems: "flex-end", gap: 2 },
  delete: { color: colors.danger, fontSize: 13, fontWeight: "700", padding: 4 },
});
