import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'taupe';
export type FontSize = 'normal' | 'large';
export type MapMarkerSize = 'small' | 'normal' | 'large';
export type BookViewMode = 'list' | 'box';
/** MAP ヘッダーの即売会タブの並び順。date=開催日 / name=名前 / created=登録順 */
export type MapEventSortKey = 'date' | 'name' | 'created';
/** MAP ヘッダーのホールタブの並び順。name=名前（東1 < 東2 < 東10 の自然順）/ created=登録順 */
export type MapHallSortKey = 'name' | 'created';
export type SortDir = 'asc' | 'desc';

export interface AppSettings {
  theme: Theme;
  backgroundImageDataUrl: string | null;
  backgroundOpacity: number;
  fontSize: FontSize;
  reduceMotion: boolean;
  mapMarkerSize: MapMarkerSize;
  /** マップのサークルピンに優先順位番号を表示するか（買い物リストの番号と連動） */
  showMapPinNumbers: boolean;
  /** 本棚の表示モード。list=テキストのみ (軽量) / box=表紙画像つき grid (仮想スクロール) */
  bookViewMode: BookViewMode;
  mapEventSortKey: MapEventSortKey;
  mapEventSortDir: SortDir;
  mapHallSortKey: MapHallSortKey;
  mapHallSortDir: SortDir;
  /**
   * ホールタブの手動並べ替え順。ホールは Circle / VenueMap から導出される文字列で
   * エンティティを持たないため、即売会ID（未分類は空文字）をキーにここへ保存する。
   */
  mapHallOrder: Record<string, string[]>;
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  backgroundImageDataUrl: null,
  backgroundOpacity: 30,
  fontSize: 'normal',
  reduceMotion: false,
  mapMarkerSize: 'normal',
  showMapPinNumbers: true,
  bookViewMode: 'list',
  mapEventSortKey: 'date',
  mapEventSortDir: 'asc',
  mapHallSortKey: 'name',
  mapHallSortDir: 'asc',
  mapHallOrder: {},
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
    if (settings.theme === 'light' || settings.theme === 'taupe') {
      html.setAttribute('data-theme', settings.theme);
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
