import type { SQLiteDatabase } from "expo-sqlite";
import { alarmSchema, type Alarm } from "../domain/alarm";
import type { AlarmRepository } from "../domain/alarmRepository";

type AlarmRow = { id: string; label: string; hour: number; minute: number; enabled: number; repeat_days: string; vibration_enabled: number; challenge_type: "shape-photo"; challenge_difficulty: "easy" | "normal" | "hard"; target_shape_id: string; created_at: string; updated_at: string };
const mapRow = (row: AlarmRow): Alarm => alarmSchema.parse({ ...row, enabled: Boolean(row.enabled), repeatDays: JSON.parse(row.repeat_days), vibrationEnabled: Boolean(row.vibration_enabled), challengeType: row.challenge_type, challengeDifficulty: row.challenge_difficulty, targetShapeId: row.target_shape_id, createdAt: row.created_at, updatedAt: row.updated_at });
const values = (alarm: Alarm) => [alarm.id, alarm.label.trim(), alarm.hour, alarm.minute, Number(alarm.enabled), JSON.stringify(alarm.repeatDays), Number(alarm.vibrationEnabled), alarm.challengeType, alarm.challengeDifficulty, alarm.targetShapeId, alarm.createdAt, alarm.updatedAt];
export class SqliteAlarmRepository implements AlarmRepository {
  constructor(private readonly db: SQLiteDatabase) {}
  async getAll() { return (await this.db.getAllAsync<AlarmRow>("SELECT * FROM alarms ORDER BY hour, minute")).map(mapRow); }
  async getById(id: string) { const row = await this.db.getFirstAsync<AlarmRow>("SELECT * FROM alarms WHERE id = ?", id); return row ? mapRow(row) : null; }
  async create(alarm: Alarm) { alarmSchema.parse(alarm); await this.db.runAsync("INSERT INTO alarms (id,label,hour,minute,enabled,repeat_days,vibration_enabled,challenge_type,challenge_difficulty,target_shape_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", ...values(alarm)); }
  async update(alarm: Alarm) { alarmSchema.parse(alarm); const result = await this.db.runAsync("UPDATE alarms SET label=?,hour=?,minute=?,enabled=?,repeat_days=?,vibration_enabled=?,challenge_type=?,challenge_difficulty=?,target_shape_id=?,updated_at=? WHERE id=?", alarm.label.trim(), alarm.hour, alarm.minute, Number(alarm.enabled), JSON.stringify(alarm.repeatDays), Number(alarm.vibrationEnabled), alarm.challengeType, alarm.challengeDifficulty, alarm.targetShapeId, alarm.updatedAt, alarm.id); if (!result.changes) throw new Error("Alarm not found while updating."); }
  async delete(id: string) { const result = await this.db.runAsync("DELETE FROM alarms WHERE id = ?", id); if (!result.changes) throw new Error("Alarm not found while deleting."); }
  async setEnabled(id: string, enabled: boolean) { const result = await this.db.runAsync("UPDATE alarms SET enabled=?, updated_at=? WHERE id=?", Number(enabled), new Date().toISOString(), id); if (!result.changes) throw new Error("Alarm not found while changing enabled state."); }
}
