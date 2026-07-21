import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import {
  challengeTypeLabels,
  type ChallengeType,
} from "@/features/alarms/domain/alarm";
import type { AppSettings } from "@/features/settings/domain/settings";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppStore } from "@/state/appStore";
import { colors } from "@/theme/colors";
const levels: AppSettings["defaultChallengeDifficulty"][] = [
  "easy",
  "normal",
  "hard",
];
const testChallengeTypes: ChallengeType[] = [
  "shape-photo",
  "quick-addition",
  "connect-dots",
];

export default function Settings() {
  const stored = useAppStore((state) => state.settings);
  const save = useAppStore((state) => state.saveSettings);
  const [settings, setSettings] = useState<AppSettings>(
    stored ?? {
      defaultVibrationEnabled: true,
      defaultChallengeDifficulty: "normal",
      emergencyOverrideEnabled: false,
    },
  );
  const [message, setMessage] = useState("");
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  return (
    <ScreenContainer>
      <View style={styles.row}>
        <Text>Default vibration</Text>
        <Switch
          value={settings.defaultVibrationEnabled}
          onValueChange={(value) => update("defaultVibrationEnabled", value)}
        />
      </View>
      <Text style={styles.label}>Default challenge difficulty</Text>
      <Text style={styles.description}>
        Used for new alarms. Easy has smaller sums, a more forgiving shape
        match, and fewer dots; hard has larger sums, a stricter match, and more
        dots.
      </Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {levels.map((level) => {
          const selected = settings.defaultChallengeDifficulty === level;
          return (
            <Pressable
              key={level}
              onPress={() => update("defaultChallengeDifficulty", level)}
              style={[styles.option, selected && styles.selected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={styles.optionText}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <Text>Emergency override enabled</Text>
        <Switch
          value={settings.emergencyOverrideEnabled}
          onValueChange={(value) => update("emergencyOverrideEnabled", value)}
        />
      </View>
      <Text style={styles.label}>Test a challenge</Text>
      <Text style={styles.description}>
        Run a challenge without starting an alarm or sound.
      </Text>
      <View style={styles.testOptions}>
        {testChallengeTypes.map((challengeType) => (
          <Pressable
            key={challengeType}
            onPress={() =>
              router.push({
                pathname: "/challenge/[alarmId]",
                params: { alarmId: `test-${challengeType}` },
              })
            }
            style={styles.testOption}
            accessibilityRole="button"
            accessibilityLabel={`Test ${challengeTypeLabels[challengeType]}`}
          >
            <Text style={styles.testOptionText}>
              Test {challengeTypeLabels[challengeType]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.privacy}>
        Alarm challenge photos are processed locally on this device. They are
        not uploaded or stored permanently.
      </Text>
      <Pressable
        style={styles.save}
        onPress={() => {
          void save(settings)
            .then(() => setMessage("Settings saved locally."))
            .catch(() => setMessage("Could not save settings."));
        }}
      >
        <Text style={styles.saveText}>Save settings</Text>
      </Pressable>
      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  label: { fontWeight: "600", marginTop: 8 },
  description: { color: colors.textMuted, lineHeight: 20, marginTop: -4 },
  options: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  optionText: {
    color: colors.text,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  testOptions: { gap: 8 },
  testOption: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  testOptionText: { color: colors.primary, fontWeight: "700" },
  save: {
    marginTop: 18,
    backgroundColor: colors.primary,
    padding: 16,
    alignItems: "center",
    borderRadius: 10,
  },
  saveText: { color: colors.surface, fontWeight: "700" },
  privacy: { color: colors.textMuted, lineHeight: 20 },
});
