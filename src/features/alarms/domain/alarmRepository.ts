import type { Alarm } from "./alarm";
export interface AlarmRepository {
  getAll(): Promise<Alarm[]>; getById(id: string): Promise<Alarm | null>; create(alarm: Alarm): Promise<void>;
  update(alarm: Alarm): Promise<void>; delete(id: string): Promise<void>; setEnabled(id: string, enabled: boolean): Promise<void>;
}
