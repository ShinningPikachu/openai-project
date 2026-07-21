import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { AlarmChallengeScreen } from "@/features/challenge/presentation/AlarmChallengeScreen";
import {
  challengeTypeSchema,
  type Alarm,
} from "@/features/alarms/domain/alarm";
import { useAppStore } from "@/state/appStore";

export default function Challenge() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const alarm = useAppStore((state) =>
    state.alarms.find((item) => item.id === alarmId),
  );
  const settings = useAppStore((state) => state.settings);
  const testChallengeType =
    typeof alarmId === "string" && alarmId.startsWith("test-")
      ? challengeTypeSchema.safeParse(alarmId.slice("test-".length)).data
      : undefined;

  if (testChallengeType) {
    const testAlarm: Alarm = {
      id: alarmId,
      label: "Challenge test",
      hour: 0,
      minute: 0,
      enabled: false,
      repeatDays: [],
      vibrationEnabled: false,
      challengeType: testChallengeType,
      challengeDifficulty: settings?.defaultChallengeDifficulty ?? "normal",
      targetShapeId: "circle",
      additionQuestionCount: 3,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    return (
      <ScreenContainer>
        <AlarmChallengeScreen
          alarm={testAlarm}
          testMode
          onCompleted={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (!alarm)
    return (
      <ScreenContainer>
        <Text>Alarm not found.</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <AlarmChallengeScreen
        alarm={alarm}
        emergencyOverrideEnabled={settings?.emergencyOverrideEnabled ?? false}
        onCompleted={() => router.replace("/")}
      />
    </ScreenContainer>
  );
}
