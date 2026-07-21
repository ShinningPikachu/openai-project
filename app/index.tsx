import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { AlarmCard } from "@/components/AlarmCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import {
  alarmNativeActions,
  isNativeAlarmSchedulerAvailable,
  isExactAlarmPermissionError,
  isNotificationPermissionError,
} from "@/platform/alarmScheduler";
import { useAppStore } from "@/state/appStore";
import { colors } from "@/theme/colors";
export default function AlarmList() {
  const { alarms, toggleAlarm, deleteAlarm } = useAppStore();
  const [ringingAlarmId, setRingingAlarmId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;

      const refreshRingingAlarm = async () => {
        if (!isNativeAlarmSchedulerAvailable()) {
          if (isCurrent) setRingingAlarmId(null);
          return;
        }

        try {
          const activeAlarm = await alarmNativeActions.getActiveAlarm();
          if (isCurrent) {
            setRingingAlarmId(
              activeAlarm?.status === "ringing" ? activeAlarm.alarmId : null,
            );
          }
        } catch (error) {
          console.warn("Could not check the active alarm.", error);
          if (isCurrent) setRingingAlarmId(null);
        }
      };

      void refreshRingingAlarm();
      const interval = setInterval(() => void refreshRingingAlarm(), 2_000);

      return () => {
        isCurrent = false;
        clearInterval(interval);
      };
    }, []),
  );

  const remove = (id: string) =>
    Alert.alert("Delete alarm?", "This alarm will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteAlarm(id).catch((error) =>
            Alert.alert("Delete failed", String(error)),
          );
        },
      },
    ]);
  const toggle = (id: string, enabled: boolean) =>
    void toggleAlarm(id, enabled).catch((error) => {
      if (isExactAlarmPermissionError(error)) {
        void alarmNativeActions
          .openExactAlarmSettings()
          .catch(() =>
            Alert.alert(
              "Exact alarm access required",
              "Allow Alarms & reminders in Android settings, then enable this alarm again.",
            ),
          );
        return;
      }
      if (isNotificationPermissionError(error)) {
        void alarmNativeActions
          .openNotificationSettings()
          .catch(() =>
            Alert.alert(
              "Alarm notifications required",
              "Allow notifications, then enable this alarm again.",
            ),
          );
        return;
      }
      Alert.alert("Update failed", String(error));
    });
  return (
    <ScreenContainer>
      {alarms.length === 0 ? (
        <Text style={styles.empty}>
          No alarms yet. Create an alarm to start the offline alarm flow.
        </Text>
      ) : (
        alarms.map((alarm) => (
          <AlarmCard
            key={alarm.id}
            alarm={alarm}
            isRinging={alarm.id === ringingAlarmId}
            onToggle={(enabled) => toggle(alarm.id, enabled)}
            onEdit={() => router.push(`/alarms/${alarm.id}`)}
            onOpenChallenge={() => router.push(`/challenge/${alarm.id}`)}
            onDelete={() => remove(alarm.id)}
          />
        ))
      )}
      <Pressable
        style={styles.button}
        onPress={() => router.push("/alarms/new")}
      >
        <Text style={styles.buttonText}>Create alarm</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/settings")}>
        <Text style={styles.settings}>Settings</Text>
      </Pressable>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  empty: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 32,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: "auto",
  },
  buttonText: { color: colors.surface, fontWeight: "700" },
  settings: {
    color: colors.primary,
    textAlign: "center",
    fontWeight: "600",
    padding: 8,
  },
});
