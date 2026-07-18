import { alarmSchema, type Alarm, type AlarmDraft } from "../domain/alarm";
import type { AlarmRepository } from "../domain/alarmRepository";
import type { AlarmScheduler } from "@/platform/alarmScheduler";
import { AlarmSchedulingError } from "@/platform/alarmScheduler";
const now = () => new Date().toISOString();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export class AlarmUseCases {
  constructor(private readonly repository: AlarmRepository, private readonly scheduler?: AlarmScheduler) {}
  list = () => this.repository.getAll(); get = (alarmId: string) => this.repository.getById(alarmId);
  async create(draft: AlarmDraft): Promise<Alarm> { const timestamp = now(); const alarm = alarmSchema.parse({ ...draft, label: draft.label.trim(), id: id(), createdAt: timestamp, updatedAt: timestamp }); await this.repository.create(alarm); if (alarm.enabled && this.scheduler) { try { await this.scheduler.schedule(alarm); } catch (error) { await this.repository.setEnabled(alarm.id, false); throw new AlarmSchedulingError(alarm.id, error); } } return alarm; }
  async update(id: string, draft: AlarmDraft): Promise<Alarm> { const existing = await this.repository.getById(id); if (!existing) throw new Error("Alarm not found."); if (this.scheduler) await this.scheduler.cancel(id); const alarm = alarmSchema.parse({ ...draft, label: draft.label.trim(), id, createdAt: existing.createdAt, updatedAt: now() }); await this.repository.update(alarm); if (alarm.enabled && this.scheduler) { try { await this.scheduler.schedule(alarm); } catch (error) { await this.repository.setEnabled(alarm.id, false); throw new AlarmSchedulingError(alarm.id, error); } } return alarm; }
  async delete(id: string) { if (this.scheduler) await this.scheduler.cancel(id); await this.repository.delete(id); }
  async toggle(id: string, enabled: boolean) { const alarm = await this.repository.getById(id); if (!alarm) throw new Error("Alarm not found."); if (!enabled && this.scheduler) await this.scheduler.cancel(id); await this.repository.setEnabled(id, enabled); if (enabled && this.scheduler) { const updated = await this.repository.getById(id); if (updated) { try { await this.scheduler.schedule(updated); } catch (error) { await this.repository.setEnabled(id, false); throw new AlarmSchedulingError(id, error); } } } }
}
