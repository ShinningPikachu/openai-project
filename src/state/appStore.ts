import { create } from "zustand";
import type { AppServices } from "@/application/services";
import type { Alarm, AlarmDraft } from "@/features/alarms/domain/alarm";
import type { AppSettings } from "@/features/settings/domain/settings";
type State = { services: AppServices | null; alarms: Alarm[]; settings: AppSettings | null; loading: boolean; error: string | null; initialize(): Promise<void>; saveAlarm(id: string | undefined, draft: AlarmDraft): Promise<void>; deleteAlarm(id: string): Promise<void>; toggleAlarm(id: string, enabled: boolean): Promise<void>; saveSettings(settings: AppSettings): Promise<void>; };
export const useAppStore = create<State>((set, get) => ({
  services: null, alarms: [], settings: null, loading: true, error: null,
  async initialize() { set({ loading: true, error: null }); try { const { createServices } = await import("@/application/services"); const services = await createServices(); const [alarms, settings] = await Promise.all([services.alarms.list(), services.settings.load()]); set({ services, alarms, settings, loading: false }); } catch (error) { console.error(error); set({ error: "Could not open local storage. Please restart the app.", loading: false }); } },
  async saveAlarm(id, draft) { const services = get().services; if (!services) throw new Error("Storage is not ready."); if (id) await services.alarms.update(id, draft); else await services.alarms.create(draft); set({ alarms: await services.alarms.list() }); },
  async deleteAlarm(id) { const services = get().services; if (!services) throw new Error("Storage is not ready."); await services.alarms.delete(id); set({ alarms: await services.alarms.list() }); },
  async toggleAlarm(id, enabled) { const services = get().services; if (!services) throw new Error("Storage is not ready."); await services.alarms.toggle(id, enabled); set({ alarms: await services.alarms.list() }); },
  async saveSettings(settings) { const services = get().services; if (!services) throw new Error("Storage is not ready."); await services.settings.update(settings); set({ settings }); },
}));
