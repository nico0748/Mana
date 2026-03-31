import type { EventTemplate } from '../types/template';

export const OFFICIAL_TEMPLATES: EventTemplate[] = [
  {
    version: '1.0',
    templateId: 'comiket106',
    name: 'コミックマーケット106',
    description: '2024年8月12日〜13日 / 東京ビッグサイト',
    event: {
      name: 'コミックマーケット106',
      date: '2024-08-12',
    },
    halls: ['東1', '東2', '東3', '東4', '東5', '東6', '西1', '西2', '西3', '西4'],
  },
  {
    version: '1.0',
    templateId: 'comiket105',
    name: 'コミックマーケット105',
    description: '2023年12月30日〜31日 / 東京ビッグサイト',
    event: {
      name: 'コミックマーケット105',
      date: '2023-12-30',
    },
    halls: ['東1', '東2', '東3', '東4', '東5', '東6', '西1', '西2', '西3', '西4', '南1', '南2'],
  },
  {
    version: '1.0',
    templateId: 'comiket104',
    name: 'コミックマーケット104',
    description: '2023年8月12日〜13日 / 東京ビッグサイト',
    event: {
      name: 'コミックマーケット104',
      date: '2023-08-12',
    },
    halls: ['東1', '東2', '東3', '東4', '東5', '東6', '西1', '西2', '西3', '西4'],
  },
  {
    version: '1.0',
    templateId: 'comitia149',
    name: 'コミティア149',
    description: '2024年8月25日 / 東京ビッグサイト',
    event: {
      name: 'コミティア149',
      date: '2024-08-25',
    },
    halls: ['東1', '東2', '東3', '東4'],
  },
  {
    version: '1.0',
    templateId: 'super_comicfes',
    name: 'スーパーコミックフェスタ',
    description: '汎用テンプレート / インテックス大阪',
    event: {
      name: 'スーパーコミックフェスタ',
    },
    halls: ['1号館', '2号館', '3号館', '4号館'],
  },
];

export function downloadTemplate(template: EventTemplate): void {
  const json = JSON.stringify(template, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.templateId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseTemplateFile(json: string): EventTemplate {
  const data = JSON.parse(json);
  if (!data.event?.name || !Array.isArray(data.halls)) {
    throw new Error('無効なテンプレート形式です');
  }
  return data as EventTemplate;
}
