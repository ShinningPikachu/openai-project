import { create } from "zustand";
import type { AppServices } from "@/application/services";
import type { Alarm, AlarmDraft } from "@/features/alarms/domain/alarm";
import type { AppSettings } from "@/features/settings/domain/settings";
type State = { services: AppServices | null; alarms: Alarm[]; settings: AppSettings | null; loading: boolean; error: string | null; initialize(): Promise<void>; saveAlarm(id: string | undefined, draft: AlarmDraft): Promise<void>; deleteAlarm(id: string): Promise<void>; toggleAlarm(id: string, enabled: boolean): Promise<void>; saveSettings(settings: AppSettings): Promise<void>; };
const refreshAlarms = async (services: AppServices, set: (state: Pick<State, "alarms">) => void) => set({ alarms: await services.alarms.list() });
const runAlarmMutation = async (services: AppServices, set: (state: Pick<State, "alarms">) => void, mutation: () => Promise<unknown>) => { let mutationError: unknown; try { await mutation(); } catch (error) { mutationError = error; } try { await refreshAlarms(services, set); } catch (error) { if (!mutationError) throw error; console.error(error); } if (mutationError) throw mutationError; };
export const useAppStore = create<State>((set, get) => ({
  services: null, alarms: [], settings: null, loading: true, error: null,
  async initialize() { set({ loading: true, error: null }); try { const { createServices } = await import("@/application/services"); const services = await createServices(); const [alarms, settings] = await Promise.all([services.alarms.list(), services.settings.load()]); set({ services, alarms, settings, loading: false }); } catch (error) { console.error(error); set({ error: "Could not open local storage. Please restart the app.", loading: false }); } },
  async saveAlarm(id, draft) { const services = get().services; if (!services) throw new Error("Storage is not ready."); await runAlarmMutation(services, set, () => id ? services.alarms.update(id, draft) : services.alarms.create(draft)); },
  async deleteAlarm(id) { const services = get().services; if (!services) throw new Error("Storage is not ready."); await runAlarmMutation(services, set, () => services.alarms.delete(id)); },
  async toggleAlarm(id, enabled) { const services = get().services; if (!services) throw new Error("Storage is not ready."); await runAlarmMutation(services, set, () => services.alarms.toggle(id, enabled)); },
  async saveSettings(settings) { const services = get().services; if (!services) throw new Error("Storage is not ready."); await services.settings.update(settings); set({ settings }); },
}));
