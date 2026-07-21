import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { AppSettings } from "@/features/settings/domain/settings";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppStore } from "@/state/appStore";
const levels: AppSettings["defaultChallengeDifficulty"][] = ["easy", "normal", "hard"];

export default function Settings() {
  const stored = useAppStore((state) => state.settings);
  const save = useAppStore((state) => state.saveSettings);
  const [settings, setSettings] = useState<AppSettings>(stored ?? {
    defaultVibrationEnabled: true,
    defaultChallengeDifficulty: "normal",
    emergencyOverrideEnabled: false,
  });
  const [message, setMessage] = useState("");
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  return (
    <ScreenContainer>
      <View style={styles.row}>
        <Text>Default vibration</Text>
        <Switch value={settings.defaultVibrationEnabled} onValueChange={(value) => update("defaultVibrationEnabled", value)} />
      </View>
      <Text style={styles.label}>Default challenge difficulty</Text>
      <Text style={styles.description}>
        Used for new alarms. Easy has smaller sums, a more forgiving shape match, and fewer dots; hard has larger sums, a stricter match, and more dots.
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
        <Switch value={settings.emergencyOverrideEnabled} onValueChange={(value) => update("emergencyOverrideEnabled", value)} />
      </View>
      <Text style={styles.privacy}>Alarm challenge photos are processed locally on this device. They are not uploaded or stored permanently.</Text>
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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  label: { fontWeight: "600", marginTop: 8 },
  description: { color: "#4b5563", lineHeight: 20, marginTop: -4 },
  options: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  option: { borderWidth: 1, borderColor: "#9ca3af", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  optionText: { fontWeight: "700", textTransform: "capitalize" },
  selected: { borderColor: "#1d4ed8", backgroundColor: "#dbeafe" },
  save: { marginTop: 18, backgroundColor: "#1d4ed8", padding: 16, alignItems: "center", borderRadius: 10 },
  saveText: { color: "white", fontWeight: "700" },
  privacy: { color: "#4b5563", lineHeight: 20 },
});
