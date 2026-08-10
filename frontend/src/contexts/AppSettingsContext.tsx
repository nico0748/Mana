import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'system' | 'dark' | 'light' | 'taupe';
export type FontSize = 'normal' | 'large' | 'xlarge';
export type MapMarkerSize = 'small' | 'normal' | 'large';
export type MapMarkerShape = 'circle' | 'rounded';
export type MapCompletedVisibility = 'show' | 'muted' | 'hidden';
export type ContentDensity = 'comfortable' | 'compact';
export type ReadingSpacing = 'normal' | 'relaxed';
export type BackgroundPosition = 'center' | 'top' | 'bottom';
export type BackgroundFit = 'cover' | 'contain';
export type AccentColor = 'emerald' | 'violet' | 'blue';
export type BookViewMode = 'list' | 'box';
/** MAP ヘッダーの即売会タブの並び順。date=開催日 / name=名前 / created=登録順 */
export type MapEventSortKey = 'date' | 'name' | 'created';
/** MAP ヘッダーのホールタブの並び順。name=名前（東1 < 東2 < 東10 の自然順）/ created=登録順 */
export type MapHallSortKey = 'name' | 'created';
export type SortDir = 'asc' | 'desc';

export interface AppSettings {
  theme: Theme;
  accentColor: AccentColor;
  highContrast: boolean;
  backgroundImageDataUrl: string | null;
  backgroundOpacity: number;
  backgroundBlur: 0 | 4 | 8;
  backgroundPosition: BackgroundPosition;
  backgroundFit: BackgroundFit;
  fontSize: FontSize;
  readingSpacing: ReadingSpacing;
  contentDensity: ContentDensity;
  reduceMotion: boolean;
  mapMarkerSize: MapMarkerSize;
  mapMarkerShape: MapMarkerShape;
  mapCompletedVisibility: MapCompletedVisibility;
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
  accentColor: 'emerald',
  highContrast: false,
  backgroundImageDataUrl: null,
  backgroundOpacity: 30,
  backgroundBlur: 0,
  backgroundPosition: 'center',
  backgroundFit: 'cover',
  fontSize: 'normal',
  readingSpacing: 'normal',
  contentDensity: 'comfortable',
  reduceMotion: false,
  mapMarkerSize: 'normal',
  mapMarkerShape: 'circle',
  mapCompletedVisibility: 'show',
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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = () => {
      const resolvedTheme = settings.theme === 'system'
        ? (mediaQuery.matches ? 'light' : 'dark')
        : settings.theme;
      if (resolvedTheme === 'light' || resolvedTheme === 'taupe') {
        html.setAttribute('data-theme', resolvedTheme);
      } else {
        html.removeAttribute('data-theme');
      }
    };

    applyTheme();
    if (settings.theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [settings.theme]);

  // Apply font-size class
  useEffect(() => {
    const html = document.documentElement;
    html.style.fontSize = settings.fontSize === 'large'
      ? '18px'
      : settings.fontSize === 'xlarge'
        ? '20px'
        : '';
  }, [settings.fontSize]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('high-contrast', settings.highContrast);
    html.dataset.contentDensity = settings.contentDensity;
    html.dataset.readingSpacing = settings.readingSpacing;
    html.dataset.accent = settings.accentColor;
  }, [settings.highContrast, settings.contentDensity, settings.readingSpacing, settings.accentColor]);

  return (
    <AppSettingsContext.Provider value={{ settings, update, reset }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
