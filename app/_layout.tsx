import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAppStore } from "@/state/appStore";
import { colors } from "@/theme/colors";
export default function Layout() {
  const { initialize, loading, error } = useAppStore();
  useEffect(() => {
    void initialize();
  }, [initialize]);
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Opening local storage…</Text>
      </View>
    );
  if (error)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          gap: 12,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          Storage unavailable
        </Text>
        <Text style={{ color: colors.textMuted }}>{error}</Text>
      </View>
    );
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Alarms" }} />
      <Stack.Screen name="alarms/new" options={{ title: "New alarm" }} />
      <Stack.Screen name="alarms/[id]" options={{ title: "Edit alarm" }} />
      <Stack.Screen
        name="challenge/[alarmId]"
        options={{ title: "Alarm challenge" }}
      />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
