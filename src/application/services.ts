import { getDatabase } from "@/database/database";
import { AlarmUseCases } from "@/features/alarms/application/alarmUseCases";
import { SqliteAlarmRepository } from "@/features/alarms/infrastructure/sqliteAlarmRepository";
import { SettingsUseCases } from "@/features/settings/application/settingsUseCases";
import { SqliteSettingsRepository } from "@/features/settings/infrastructure/sqliteSettingsRepository";
import { NativeAlarmScheduler } from "@/platform/alarmScheduler";
export async function createServices() { const db = await getDatabase(); const alarmRepository = new SqliteAlarmRepository(db); const scheduler = new NativeAlarmScheduler(); const alarms = await alarmRepository.getAll(); await scheduler.rescheduleAll(alarms.filter((alarm) => alarm.enabled)).catch((error) => console.warn("Native alarm reconciliation failed", error)); return { alarms: new AlarmUseCases(alarmRepository, scheduler), settings: new SettingsUseCases(new SqliteSettingsRepository(db)), alarmScheduler: scheduler }; }
export type AppServices = Awaited<ReturnType<typeof createServices>>;
