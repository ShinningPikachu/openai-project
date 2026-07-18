import { getDatabase } from "@/database/database";
import { AlarmUseCases } from "@/features/alarms/application/alarmUseCases";
import { SqliteAlarmRepository } from "@/features/alarms/infrastructure/sqliteAlarmRepository";
import { SettingsUseCases } from "@/features/settings/application/settingsUseCases";
import { SqliteSettingsRepository } from "@/features/settings/infrastructure/sqliteSettingsRepository";
export async function createServices() { const db = await getDatabase(); return { alarms: new AlarmUseCases(new SqliteAlarmRepository(db)), settings: new SettingsUseCases(new SqliteSettingsRepository(db)) }; }
export type AppServices = Awaited<ReturnType<typeof createServices>>;
