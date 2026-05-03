import type { AppSettings } from "../types";
import { STORAGE_KEYS, defaultSettings } from "../types";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...defaultSettings };

    const parsed = JSON.parse(raw);

    if (parsed.schemaVersion !== 1) {
      return { ...defaultSettings };
    }

    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  const safeSettings: AppSettings = {
    ...settings,
    ncbiApiKey: settings.saveApiKey ? settings.ncbiApiKey : undefined,
  };

  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(safeSettings));
}
