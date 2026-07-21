import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { Alarm, AlarmDraft, RepeatDay } from "@/features/alarms/domain/alarm";
import type { AppSettings } from "@/features/settings/domain/settings";
import {
  normalizeShapeTargetId,
  simpleShapeTargets,
  type SimpleShapeTargetId,
} from "@/features/challenge/domain/ShapeTarget";
import {
  alarmNativeActions,
  isExactAlarmPermissionError,
  isNotificationPermissionError,
} from "@/platform/alarmScheduler";

const days: RepeatDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function AlarmEditorForm({
  alarm,
  settings,
  onSave,
}: {
  alarm?: Alarm;
  settings: AppSettings | null;
  onSave(draft: AlarmDraft): Promise<void>;
}) {
  const [label, setLabel] = useState(alarm?.label ?? "");
  const [hour, setHour] = useState(String(alarm?.hour ?? 7));
  const [minute, setMinute] = useState(String(alarm?.minute ?? 0));
  const [enabled, setEnabled] = useState(alarm?.enabled ?? true);
  const [repeatDays, setRepeatDays] = useState<RepeatDay[]>(alarm?.repeatDays ?? []);
  const [vibrationEnabled, setVibrationEnabled] = useState(
    alarm?.vibrationEnabled ?? settings?.defaultVibrationEnabled ?? true,
  );
  const [targetShapeId, setTargetShapeId] = useState<SimpleShapeTargetId>(() =>
    normalizeShapeTargetId(alarm?.targetShapeId),
  );
  const [error, setError] = useState<string | null>(null);
  const [needsExactAlarmPermission, setNeedsExactAlarmPermission] = useState(false);
  const [needsNotificationPermission, setNeedsNotificationPermission] = useState(false);

  const openExactAlarmSettings = async () => {
    try {
      await alarmNativeActions.openExactAlarmSettings();
      setError("Android alarm settings opened. Allow Alarms & reminders, then save this alarm again.");
    } catch {
      setError("Exact alarm access is required. Use the button below to open Android alarm settings.");
    }
  };

  const openNotificationSettings = async () => {
    try {
      await alarmNativeActions.openNotificationSettings();
      setError("Android notification settings opened. Allow notifications, then save this alarm again.");
    } catch {
      setError("Notification permission is required. Use the button below to open Android notification settings.");
    }
  };

  const submit = async () => {
    const numericHour = Number(hour);
    const numericMinute = Number(minute);
    if (
      !Number.isInteger(numericHour) ||
      numericHour < 0 ||
      numericHour > 23 ||
      !Number.isInteger(numericMinute) ||
      numericMinute < 0 ||
      numericMinute > 59
    ) {
      setError("Enter an hour from 0–23 and a minute from 0–59.");
      return;
    }
    try {
      setError(null);
      setNeedsExactAlarmPermission(false);
      setNeedsNotificationPermission(false);
      await onSave({
        label: label.trim(),
        hour: numericHour,
        minute: numericMinute,
        enabled,
        repeatDays,
        vibrationEnabled,
        challengeType: "shape-photo",
        challengeDifficulty:
          alarm?.challengeDifficulty ?? settings?.defaultChallengeDifficulty ?? "normal",
        targetShapeId,
      });
    } catch (cause) {
      console.error(cause);
      if (isExactAlarmPermissionError(cause)) {
        setNeedsExactAlarmPermission(true);
        await openExactAlarmSettings();
        return;
      }
      if (isNotificationPermissionError(cause)) {
        setNeedsNotificationPermission(true);
        await openNotificationSettings();
        return;
      }
      setError("Could not save this alarm. Please try again.");
    }
  };

  const toggleDay = (day: RepeatDay) =>
    setRepeatDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Label</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Morning alarm"
        style={styles.input}
        accessibilityLabel="Alarm label"
      />

      <View style={styles.row}>
        <View style={styles.timePart}>
          <Text style={styles.label}>Hour (0–23)</Text>
          <TextInput
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            style={styles.input}
            accessibilityLabel="Hour"
          />
        </View>
        <View style={styles.timePart}>
          <Text style={styles.label}>Minute (0–59)</Text>
          <TextInput
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            style={styles.input}
            accessibilityLabel="Minute"
          />
        </View>
      </View>

      <Text style={styles.label}>Repeat days</Text>
      <View style={styles.days}>
        {days.map((day) => (
          <Pressable
            key={day}
            onPress={() => toggleDay(day)}
            style={[styles.day, repeatDays.includes(day) && styles.daySelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: repeatDays.includes(day) }}
          >
            <Text style={repeatDays.includes(day) && styles.dayTextSelected}>
              {day.slice(0, 3)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text>Alarm enabled</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>
      <View style={styles.switchRow}>
        <Text>Vibration</Text>
        <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} />
      </View>

      <View>
        <Text style={styles.label}>Challenge type</Text>
        <Text style={styles.value}>Shape Photo Challenge</Text>
      </View>
      <View>
        <Text style={styles.label}>Target shape</Text>
        <View style={styles.shapeTargets}>
          {simpleShapeTargets.map((shape) => {
            const selected = shape.id === targetShapeId;
            return (
              <Pressable
                key={shape.id}
                onPress={() => setTargetShapeId(shape.id)}
                style={[styles.shapeTarget, selected && styles.shapeTargetSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.shapeTargetName, selected && styles.shapeTargetTextSelected]}>
                  {shape.name}
                </Text>
                <Text style={[styles.shapeTargetDescription, selected && styles.shapeTargetTextSelected]}>
                  {shape.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {needsExactAlarmPermission ? (
        <Pressable
          onPress={() => void openExactAlarmSettings()}
          accessibilityRole="button"
        >
          <Text style={styles.permission}>Allow exact alarms</Text>
        </Pressable>
      ) : null}
      {needsNotificationPermission ? (
        <Pressable
          onPress={() => void openNotificationSettings()}
          accessibilityRole="button"
        >
          <Text style={styles.permission}>Allow alarm notifications</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={submit} style={styles.save} accessibilityRole="button">
        <Text style={styles.saveText}>Save alarm</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  label: { fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 12 },
  timePart: { flex: 1 },
  days: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  day: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    textTransform: "capitalize",
  },
  daySelected: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  dayTextSelected: { color: "white" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  value: { color: "#4b5563" },
  shapeTargets: { gap: 8 },
  shapeTarget: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 10,
    padding: 12,
  },
  shapeTargetSelected: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  shapeTargetName: { fontWeight: "700" },
  shapeTargetDescription: { color: "#4b5563", marginTop: 2 },
  shapeTargetTextSelected: { color: "white" },
  error: { color: "#b42318" },
  permission: { color: "#1d4ed8", fontWeight: "700", textAlign: "center" },
  save: {
    backgroundColor: "#1d4ed8",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { color: "white", fontWeight: "700", fontSize: 16 },
});
