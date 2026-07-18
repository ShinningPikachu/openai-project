import { describe, expect, it } from "vitest";
import { AlarmUseCases } from "./alarmUseCases";
import type { Alarm } from "../domain/alarm";
import type { AlarmRepository } from "../domain/alarmRepository";

class MemoryAlarmRepository implements AlarmRepository {
  private items = new Map<string, Alarm>();
  getAll = async () => [...this.items.values()];
  getById = async (id: string) => this.items.get(id) ?? null;
  create = async (alarm: Alarm) => { if (this.items.has(alarm.id)) throw new Error("Duplicate ID"); this.items.set(alarm.id, alarm); };
  update = async (alarm: Alarm) => { if (!this.items.has(alarm.id)) throw new Error("Not found"); this.items.set(alarm.id, alarm); };
  delete = async (id: string) => { if (!this.items.delete(id)) throw new Error("Not found"); };
  setEnabled = async (id: string, enabled: boolean) => { const alarm = this.items.get(id); if (!alarm) throw new Error("Not found"); this.items.set(id, { ...alarm, enabled }); };
}
const draft = { label: " Wake ", hour: 7, minute: 30, enabled: true, repeatDays: [], vibrationEnabled: true, challengeType: "shape-photo" as const, challengeDifficulty: "normal" as const, targetShapeId: "elongated" };
describe("alarm use cases", () => {
  it("creates a trimmed alarm", async () => { const alarms = new AlarmUseCases(new MemoryAlarmRepository()); const created = await alarms.create(draft); expect(created.label).toBe("Wake"); expect(created.id).not.toBe(""); });
  it("updates an existing alarm and its timestamp", async () => { const alarms = new AlarmUseCases(new MemoryAlarmRepository()); const created = await alarms.create(draft); const updated = await alarms.update(created.id, { ...draft, label: "Changed", minute: 45 }); expect(updated.label).toBe("Changed"); expect(updated.minute).toBe(45); expect(updated.createdAt).toBe(created.createdAt); });
  it("toggles and deletes an alarm", async () => { const repo = new MemoryAlarmRepository(); const alarms = new AlarmUseCases(repo); const created = await alarms.create(draft); await alarms.toggle(created.id, false); expect((await alarms.get(created.id))?.enabled).toBe(false); await alarms.delete(created.id); expect(await alarms.get(created.id)).toBeNull(); });
});
