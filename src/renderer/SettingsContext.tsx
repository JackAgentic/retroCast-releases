import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

const api = (window as any).videoCast;

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  loaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => { },
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getSettings().then((s: AppSettings) => {
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const merged = { ...settings, ...partial };
    setSettings(merged);
    await api.saveSettings(merged);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
