import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppStore } from "@/state/appStore";
import { CameraChallengeScreen } from "@/features/challenge/presentation/CameraChallengeScreen";
export default function Challenge() { const { alarmId } = useLocalSearchParams<{ alarmId: string }>(); const alarm = useAppStore((state) => state.alarms.find((item) => item.id === alarmId)); if (!alarm) return <ScreenContainer><Text>Alarm not found.</Text></ScreenContainer>; return <ScreenContainer><CameraChallengeScreen alarm={alarm} onCompleted={() => router.replace("/")} /></ScreenContainer>; }
