import { alarmSchema, type Alarm, type AlarmDraft } from "../domain/alarm";
import type { AlarmRepository } from "../domain/alarmRepository";
const now = () => new Date().toISOString();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export class AlarmUseCases {
  constructor(private readonly repository: AlarmRepository) {}
  list = () => this.repository.getAll(); get = (alarmId: string) => this.repository.getById(alarmId);
  async create(draft: AlarmDraft): Promise<Alarm> { const timestamp = now(); const alarm = alarmSchema.parse({ ...draft, label: draft.label.trim(), id: id(), createdAt: timestamp, updatedAt: timestamp }); await this.repository.create(alarm); return alarm; }
  async update(id: string, draft: AlarmDraft): Promise<Alarm> { const existing = await this.repository.getById(id); if (!existing) throw new Error("Alarm not found."); const alarm = alarmSchema.parse({ ...draft, label: draft.label.trim(), id, createdAt: existing.createdAt, updatedAt: now() }); await this.repository.update(alarm); return alarm; }
  delete = (id: string) => this.repository.delete(id); toggle = (id: string, enabled: boolean) => this.repository.setEnabled(id, enabled);
}
