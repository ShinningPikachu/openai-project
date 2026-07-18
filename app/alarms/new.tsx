import { router } from "expo-router";
import { AlarmEditorForm } from "@/components/AlarmEditorForm";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAppStore } from "@/state/appStore";
export default function NewAlarm() { const { settings, saveAlarm } = useAppStore(); return <ScreenContainer><AlarmEditorForm settings={settings} onSave={async (draft) => { await saveAlarm(undefined, draft); router.back(); }} /></ScreenContainer>; }
