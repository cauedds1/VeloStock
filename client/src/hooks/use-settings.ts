import { useState, useEffect } from 'react';

export interface AppSettings {
  deleteConfirmation: boolean;
  darkMode: boolean;
  autoUpdate: boolean;
  taskAlerts: boolean;
  stuckVehicleAlerts: boolean;
  readyForSaleAlerts: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  deleteConfirmation: true,
  darkMode: true,
  autoUpdate: true,
  taskAlerts: true,
  stuckVehicleAlerts: true,
  readyForSaleAlerts: true,
};

const STORAGE_KEY = 'autoflow-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return {
    settings,
    updateSetting,
  };
}
