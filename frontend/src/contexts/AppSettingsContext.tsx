import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type FontSize = 'normal' | 'large';

export interface AppSettings {
  theme: Theme;
  backgroundImageDataUrl: string | null;
  backgroundOpacity: number;
  fontSize: FontSize;
  reduceMotion: boolean;
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  backgroundImageDataUrl: null,
  backgroundOpacity: 30,
  fontSize: 'normal',
  reduceMotion: false,
};

const STORAGE_KEY = 'doujin-pp-settings';

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface AppSettingsContextValue {
  settings: AppSettings;
  update: (partial: Partial<AppSettings>) => void;
  reset: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
  reset: () => {},
});

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(load);

  const update = (partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      save(next);
      return next;
    });
  };

  const reset = () => {
    setSettings(DEFAULTS);
    save(DEFAULTS);
  };

  // Apply theme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
  }, [settings.theme]);

  // Apply font-size class
  useEffect(() => {
    const html = document.documentElement;
    if (settings.fontSize === 'large') {
      html.style.fontSize = '18px';
    } else {
      html.style.fontSize = '';
    }
  }, [settings.fontSize]);

  return (
    <AppSettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
