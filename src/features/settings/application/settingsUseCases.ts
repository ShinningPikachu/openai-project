import { appSettingsSchema, type AppSettings } from "../domain/settings";
import type { SettingsRepository } from "../domain/settingsRepository";
export class SettingsUseCases { constructor(private readonly repository: SettingsRepository) {} load = () => this.repository.get(); update = (settings: AppSettings) => this.repository.update(appSettingsSchema.parse(settings)); }
