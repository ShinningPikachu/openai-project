import type { SQLiteDatabase } from "expo-sqlite";
import { appSettingsSchema, defaultSettings, type AppSettings } from "../domain/settings";
import type { SettingsRepository } from "../domain/settingsRepository";
type Row = { default_vibration_enabled: number; default_challenge_difficulty: "easy" | "normal" | "hard"; emergency_override_enabled: number };
export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SQLiteDatabase) {}
  async get() { const row = await this.db.getFirstAsync<Row>("SELECT * FROM app_settings WHERE id=1"); if (!row) { await this.update(defaultSettings); return defaultSettings; } return appSettingsSchema.parse({ defaultVibrationEnabled: Boolean(row.default_vibration_enabled), defaultChallengeDifficulty: row.default_challenge_difficulty, emergencyOverrideEnabled: Boolean(row.emergency_override_enabled) }); }
  async update(settings: AppSettings) { const value = appSettingsSchema.parse(settings); await this.db.runAsync("INSERT OR REPLACE INTO app_settings (id,default_vibration_enabled,default_challenge_difficulty,emergency_override_enabled) VALUES (1,?,?,?)", Number(value.defaultVibrationEnabled), value.defaultChallengeDifficulty, Number(value.emergencyOverrideEnabled)); }
}
