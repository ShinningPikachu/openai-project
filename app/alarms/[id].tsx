import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { AlarmEditorForm } from "@/components/AlarmEditorForm";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppStore } from "@/state/appStore";
export default function EditAlarm() { const { id } = useLocalSearchParams<{ id: string }>(); const { alarms, settings, saveAlarm } = useAppStore(); const alarm = alarms.find((item) => item.id === id); if (!alarm) return <ScreenContainer><Text>Alarm not found. It may have been deleted.</Text></ScreenContainer>; return <ScreenContainer><AlarmEditorForm alarm={alarm} settings={settings} onSave={async (draft) => { await saveAlarm(alarm.id, draft); router.back(); }} /></ScreenContainer>; }
