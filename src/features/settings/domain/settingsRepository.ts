import type { AppSettings } from "./settings";
export interface SettingsRepository { get(): Promise<AppSettings>; update(settings: AppSettings): Promise<void>; }
