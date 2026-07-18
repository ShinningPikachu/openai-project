export const migrations = [{
  version: 1,
  statements: [
    `CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY NOT NULL, label TEXT NOT NULL, hour INTEGER NOT NULL, minute INTEGER NOT NULL, enabled INTEGER NOT NULL, repeat_days TEXT NOT NULL, vibration_enabled INTEGER NOT NULL, challenge_type TEXT NOT NULL, challenge_difficulty TEXT NOT NULL, target_shape_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS app_settings (id INTEGER PRIMARY KEY CHECK (id = 1), default_vibration_enabled INTEGER NOT NULL, default_challenge_difficulty TEXT NOT NULL, emergency_override_enabled INTEGER NOT NULL, theme TEXT NOT NULL)`,
  ],
}];
