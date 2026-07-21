export const migrations = [{
  version: 1,
  statements: [
    `CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY NOT NULL, label TEXT NOT NULL, hour INTEGER NOT NULL, minute INTEGER NOT NULL, enabled INTEGER NOT NULL, repeat_days TEXT NOT NULL, vibration_enabled INTEGER NOT NULL, challenge_type TEXT NOT NULL, challenge_difficulty TEXT NOT NULL, target_shape_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY CHECK (id = 1), default_vibration_enabled INTEGER NOT NULL, default_challenge_difficulty TEXT NOT NULL, emergency_override_enabled INTEGER NOT NULL)`,
  ],
}, {
  version: 2,
  statements: [
    "ALTER TABLE alarms ADD COLUMN addition_question_count INTEGER NOT NULL DEFAULT 3",
  ],
}, {
  version: 3,
  statements: [
    `CREATE TABLE app_settings_without_theme (id INTEGER PRIMARY KEY CHECK (id = 1), default_vibration_enabled INTEGER NOT NULL, default_challenge_difficulty TEXT NOT NULL, emergency_override_enabled INTEGER NOT NULL)`,
    `INSERT INTO app_settings_without_theme (id,default_vibration_enabled,default_challenge_difficulty,emergency_override_enabled) SELECT id,default_vibration_enabled,default_challenge_difficulty,emergency_override_enabled FROM app_settings`,
    "DROP TABLE app_settings",
    "ALTER TABLE app_settings_without_theme RENAME TO app_settings",
  ],
}];
