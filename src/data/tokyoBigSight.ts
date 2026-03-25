// ============================================================
// 東京ビッグサイト 会場データ定義
// コミケ会場マップ画像から読み取った構造情報
// ============================================================

import type { Hall, Block, HallConnection, VenueLayout, BlockNaming } from '../types/venueMap';

// ─────────────────────────────────────────────
// ブロック名テンプレート
// ─────────────────────────────────────────────

/** アルファベット大文字 A-Z */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** アルファベット小文字 a-z */
const ALPHABET_LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** ひらがな（会場で使用される順序） */
const HIRAGANA = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
];

/** カタカナ（会場で使用される順序） */
const KATAKANA = [
  'ア', 'イ', 'ウ', 'エ', 'オ',
  'カ', 'キ', 'ク', 'ケ', 'コ',
  'サ', 'シ', 'ス', 'セ', 'ソ',
  'タ', 'チ', 'ツ', 'テ', 'ト',
  'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
  'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
  'マ', 'ミ', 'ム', 'メ', 'モ',
  'ヤ', 'ユ', 'ヨ',
  'ラ', 'リ', 'ル', 'レ', 'ロ',
  'ワ',
];

// ─────────────────────────────────────────────
// ヘルパー関数
// ─────────────────────────────────────────────

/**
 * Create an array of block definitions positioned along a vertical range within a hall.
 *
 * @param naming - Naming scheme used for each block
 * @param spaceCount - Number of spaces assigned to each generated block
 * @param startY - Start position on the Y axis (0–100) where the first block is placed
 * @param endY - End position on the Y axis (0–100) where the last block is placed
 * @param orientation - Block orientation, either `horizontal` or `vertical`
 * @returns An array of `Block` objects with computed `id`, `hallId`, `name`, `naming`, `spaceCount`, `position` (x fixed at 50, y interpolated between `startY` and `endY`), `orientation`, and `isWall: false`; returns an empty array when `names` is empty
 */
function generateBlocks(
  hallId: string,
  names: string[],
  naming: BlockNaming,
  spaceCount: number,
  startY: number,
  endY: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): Block[] {
  const count = names.length;
  if (count === 0) return [];

  return names.map((name, i) => {
    const yRatio = count > 1 ? i / (count - 1) : 0.5;
    const y = startY + (endY - startY) * yRatio;

    return {
      id: `${hallId}_${name}`,
      hallId,
      name,
      naming,
      spaceCount,
      position: { x: 50, y },
      orientation,
      isWall: false,
    };
  });
}

/**
 * Create circular "wall" blocks positioned along a specified hall edge.
 *
 * Each returned block has an `id` of `${hallId}_${name}`, a `position` with coordinates
 * relative to the hall bounds, an `orientation` (vertical for left/right, horizontal for top/bottom),
 * and `isWall` set to `true`.
 *
 * @param hallId - Identifier of the hall these blocks belong to
 * @param names - Ordered list of block names placed along the specified side
 * @param naming - Naming scheme metadata applied to each block
 * @param spaceCount - Number of spaces assigned to each generated block
 * @param side - Edge of the hall where blocks are placed: `left`/`right` position `x` near the sides, `top`/`bottom` position `y` near the sides
 * @returns An array of `Block` objects placed along the given side with computed relative positions and wall orientation
 */
function generateWallBlocks(
  hallId: string,
  names: string[],
  naming: BlockNaming,
  spaceCount: number,
  side: 'left' | 'right' | 'top' | 'bottom',
): Block[] {
  return names.map((name, i) => {
    const ratio = names.length > 1 ? i / (names.length - 1) : 0.5;
    let x = 50;
    let y = 50;

    switch (side) {
      case 'left':
        x = 5;
        y = 10 + 80 * ratio;
        break;
      case 'right':
        x = 95;
        y = 10 + 80 * ratio;
        break;
      case 'top':
        x = 10 + 80 * ratio;
        y = 5;
        break;
      case 'bottom':
        x = 10 + 80 * ratio;
        y = 95;
        break;
    }

    return {
      id: `${hallId}_${name}`,
      hallId,
      name,
      naming,
      spaceCount,
      position: { x, y },
      orientation: side === 'left' || side === 'right' ? 'vertical' : 'horizontal',
      isWall: true,
    };
  });
}

// ─────────────────────────────────────────────
// ホール定義
// ─────────────────────────────────────────────

/** 全ホール基本情報（位置・サイズは相対的なレイアウト座標） */
const hallDefinitions: Omit<Hall, 'blocks'>[] = [
  // 東展示棟
  { id: 'east1', area: 'east', number: 1, label: '東1', bounds: { x: 75, y: 60, width: 25, height: 40 } },
  { id: 'east2', area: 'east', number: 2, label: '東2', bounds: { x: 50, y: 60, width: 25, height: 40 } },
  { id: 'east3', area: 'east', number: 3, label: '東3', bounds: { x: 25, y: 60, width: 25, height: 40 } },
  { id: 'east4', area: 'east', number: 4, label: '東4', bounds: { x: 0, y: 30, width: 25, height: 35 } },
  { id: 'east5', area: 'east', number: 5, label: '東5', bounds: { x: 25, y: 30, width: 25, height: 35 } },
  { id: 'east6', area: 'east', number: 6, label: '東6', bounds: { x: 50, y: 30, width: 25, height: 35 } },
  { id: 'east7', area: 'east', number: 7, label: '東7', bounds: { x: 0, y: 0, width: 50, height: 30 } },
  { id: 'east8', area: 'east', number: 8, label: '東8', bounds: { x: 50, y: 0, width: 50, height: 30 } },
  // 西展示棟
  { id: 'west1', area: 'west', number: 1, label: '西1', bounds: { x: 0, y: 0, width: 50, height: 50 } },
  { id: 'west2', area: 'west', number: 2, label: '西2', bounds: { x: 50, y: 0, width: 50, height: 50 } },
  { id: 'west3', area: 'west', number: 3, label: '西3', bounds: { x: 0, y: 50, width: 50, height: 50 } },
  { id: 'west4', area: 'west', number: 4, label: '西4', bounds: { x: 50, y: 50, width: 50, height: 50 } },
  // 南展示棟
  { id: 'south1', area: 'south', number: 1, label: '南1', bounds: { x: 0, y: 0, width: 50, height: 50 } },
  { id: 'south2', area: 'south', number: 2, label: '南2', bounds: { x: 50, y: 0, width: 50, height: 50 } },
  { id: 'south3', area: 'south', number: 3, label: '南3', bounds: { x: 0, y: 50, width: 50, height: 50 } },
  { id: 'south4', area: 'south', number: 4, label: '南4', bounds: { x: 50, y: 50, width: 50, height: 50 } },
];

// ─────────────────────────────────────────────
// ホール間接続定義
// ─────────────────────────────────────────────

/** ホール間の移動コスト定数 */
const DIRECT_CONNECTION_WEIGHT = 30;   // 直結ホール間
const CORRIDOR_CONNECTION_WEIGHT = 60; // 廊下経由
const BRIDGE_CONNECTION_WEIGHT = 120;  // 連絡通路（棟間移動）

/** 基本的なホール間接続（固定構造） */
const baseConnections: HallConnection[] = [
  // 東展示棟: 東1-2-3 は連結ホール
  { fromHallId: 'east1', toHallId: 'east2', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 0, y: 50 }, toPosition: { x: 100, y: 50 } },
  { fromHallId: 'east2', toHallId: 'east3', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 0, y: 50 }, toPosition: { x: 100, y: 50 } },
  // 東展示棟: 東4-5-6 は連結ホール
  { fromHallId: 'east4', toHallId: 'east5', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 50 }, toPosition: { x: 0, y: 50 } },
  { fromHallId: 'east5', toHallId: 'east6', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 50 }, toPosition: { x: 0, y: 50 } },
  // 東展示棟: 東7-8 は連結ホール
  { fromHallId: 'east7', toHallId: 'east8', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 50 }, toPosition: { x: 0, y: 50 } },
  // 東展示棟: 東4-6 ↔ 東7（渡り廊下）
  { fromHallId: 'east4', toHallId: 'east7', type: 'corridor', weight: CORRIDOR_CONNECTION_WEIGHT,
    fromPosition: { x: 50, y: 0 }, toPosition: { x: 50, y: 100 } },
  // 東展示棟: 東1-3 ↔ 東4-6（通路）
  { fromHallId: 'east3', toHallId: 'east4', type: 'corridor', weight: CORRIDOR_CONNECTION_WEIGHT,
    fromPosition: { x: 0, y: 0 }, toPosition: { x: 0, y: 100 } },
  { fromHallId: 'east6', toHallId: 'east1', type: 'corridor', weight: CORRIDOR_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 100 }, toPosition: { x: 100, y: 0 } },
  // 西展示棟: 西1-2 は連結
  { fromHallId: 'west1', toHallId: 'west2', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 50 }, toPosition: { x: 0, y: 50 } },
  // 西展示棟: 西3-4 は連結
  { fromHallId: 'west3', toHallId: 'west4', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 50 }, toPosition: { x: 0, y: 50 } },
  // 南展示棟: 南1-2 は連結
  { fromHallId: 'south1', toHallId: 'south2', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 50 }, toPosition: { x: 0, y: 50 } },
  // 南展示棟: 南3-4 は連結
  { fromHallId: 'south3', toHallId: 'south4', type: 'direct', weight: DIRECT_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 50 }, toPosition: { x: 0, y: 50 } },
  // 棟間: 東 ↔ 西（エントランス経由）
  { fromHallId: 'east1', toHallId: 'west2', type: 'bridge', weight: BRIDGE_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 0 }, toPosition: { x: 100, y: 0 } },
  // 棟間: 東 ↔ 南
  { fromHallId: 'east1', toHallId: 'south2', type: 'bridge', weight: BRIDGE_CONNECTION_WEIGHT,
    fromPosition: { x: 100, y: 100 }, toPosition: { x: 100, y: 0 } },
  // 棟間: 西 ↔ 南
  { fromHallId: 'west1', toHallId: 'south1', type: 'bridge', weight: BRIDGE_CONNECTION_WEIGHT,
    fromPosition: { x: 0, y: 100 }, toPosition: { x: 0, y: 0 } },
];

// ─────────────────────────────────────────────
// コミックマーケット105 配置データ
// ─────────────────────────────────────────────

/**
 * Builds the venue layout for Comic Market 105, including hall definitions, block assignments, and inter-hall connections.
 *
 * The layout assigns block name series to specific halls (East-1: A–H, East-2: K–Y, East-3: Katakana ア–シ, East-4: Katakana ラ–ワ, East-7: a–m, West halls: Hiragana) and includes empty entries for halls that have no blocks defined.
 *
 * @returns The constructed VenueLayout for event code "C105".
 */
function buildC105Layout(): VenueLayout {
  const hallMap = new Map(hallDefinitions.map(h => [h.id, h]));

  const hallBlockConfigs: Array<{
    hallId: string;
    names: string[];
    naming: BlockNaming;
    spaceCount: number;
    wallNames?: string[];
    wallSide?: 'left' | 'right' | 'top' | 'bottom';
  }> = [
    // 東1: ブロック A-H (アルファベット)
    { hallId: 'east1', names: ALPHABET.slice(0, 8), naming: 'alphabet', spaceCount: 30 },
    // 東2: ブロック K-Y (アルファベット)
    { hallId: 'east2', names: ALPHABET.slice(10, 25), naming: 'alphabet', spaceCount: 30 },
    // 東3: ブロック ア-シ (カタカナ)
    { hallId: 'east3', names: KATAKANA.slice(0, 12), naming: 'katakana', spaceCount: 30 },
    // 東4: ブロック ラ-ワ (カタカナ)
    { hallId: 'east4', names: KATAKANA.slice(38, 44), naming: 'katakana', spaceCount: 30 },
    // 東7: ブロック a-m (小文字アルファベット)
    { hallId: 'east7', names: ALPHABET_LOWER.slice(0, 13), naming: 'alphabet_lower', spaceCount: 30 },
    // 西1-2: ひらがなブロック
    { hallId: 'west1', names: HIRAGANA.slice(0, 15), naming: 'hiragana', spaceCount: 30 },
    { hallId: 'west2', names: HIRAGANA.slice(15, 30), naming: 'hiragana', spaceCount: 30 },
  ];

  const halls: Hall[] = hallBlockConfigs.map(config => {
    const hallDef = hallMap.get(config.hallId);
    if (!hallDef) throw new Error(`Unknown hall: ${config.hallId}`);

    const blocks = [
      ...generateBlocks(config.hallId, config.names, config.naming, config.spaceCount, 10, 90),
      ...(config.wallNames
        ? generateWallBlocks(config.hallId, config.wallNames, config.naming, config.spaceCount, config.wallSide ?? 'left')
        : []),
    ];

    return { ...hallDef, blocks };
  });

  // 使用されないホール（空のブロック）も追加
  for (const hallDef of hallDefinitions) {
    if (!halls.find(h => h.id === hallDef.id)) {
      halls.push({ ...hallDef, blocks: [] });
    }
  }

  return {
    id: 'c105',
    eventName: 'コミックマーケット105',
    eventCode: 'C105',
    halls,
    connections: baseConnections,
  };
}

// ─────────────────────────────────────────────
// コミックマーケット106 配置データ
// ─────────────────────────────────────────────

/**
 * Build the venue layout for Comic Market 106 (C106).
 *
 * Configures blocks for event-specific halls (east4–east7, south1–south2, west1–west2) with the following naming:
 * - east4/east5/east6: katakana sequences
 * - east7, south1, south2: uppercase alphabet sequences
 * - west1, west2: hiragana sequences
 *
 * @returns The constructed VenueLayout for C106, including halls with their blocks and shared connections.
 * @throws Error if a configured hall ID is not present in the hall definitions.
 */
function buildC106Layout(): VenueLayout {
  const hallMap = new Map(hallDefinitions.map(h => [h.id, h]));

  // C106 東4: カタカナ ヨ→ヒ（画像左→右の並び）
  const east4Blocks = ['ヨ', 'ユ', 'ヤ', 'モ', 'メ', 'ム', 'ミ', 'マ', 'ホ', 'ヘ', 'フ', 'ヒ'];
  // C106 東5: カタカナ ハ→ソ
  const east5Blocks = ['ハ', 'ノ', 'ネ', 'ニ', 'ナ', 'ト', 'テ', 'ツ', 'タ', 'ソ'];
  // C106 東6: カタカナ ス→ア（降順配置）
  const east6Blocks = ['ス', 'シ', 'サ', 'コ', 'ケ', 'ク', 'キ', 'カ', 'オ', 'エ', 'ウ', 'イ', 'ア'];

  const hallBlockConfigs: Array<{
    hallId: string;
    names: string[];
    naming: BlockNaming;
    spaceCount: number;
  }> = [
    // 東4: カタカナ ヨ-ヒ
    { hallId: 'east4', names: east4Blocks, naming: 'katakana', spaceCount: 30 },
    // 東5: カタカナ ハ-ソ
    { hallId: 'east5', names: east5Blocks, naming: 'katakana', spaceCount: 30 },
    // 東6: カタカナ ス-ア
    { hallId: 'east6', names: east6Blocks, naming: 'katakana', spaceCount: 30 },
    // 東7: アルファベット A-M
    { hallId: 'east7', names: ALPHABET.slice(0, 13), naming: 'alphabet', spaceCount: 30 },
    // 南1: サークルスペース
    { hallId: 'south1', names: ALPHABET.slice(0, 10), naming: 'alphabet', spaceCount: 25 },
    // 南2: サークルスペース
    { hallId: 'south2', names: ALPHABET.slice(10, 20), naming: 'alphabet', spaceCount: 25 },
    // 西1-2: ひらがな
    { hallId: 'west1', names: HIRAGANA.slice(0, 15), naming: 'hiragana', spaceCount: 30 },
    { hallId: 'west2', names: HIRAGANA.slice(15, 30), naming: 'hiragana', spaceCount: 30 },
  ];

  const halls: Hall[] = hallBlockConfigs.map(config => {
    const hallDef = hallMap.get(config.hallId);
    if (!hallDef) throw new Error(`Unknown hall: ${config.hallId}`);

    const blocks = generateBlocks(
      config.hallId, config.names, config.naming, config.spaceCount, 10, 90,
    );

    return { ...hallDef, blocks };
  });

  // 使用されないホールも空で追加
  for (const hallDef of hallDefinitions) {
    if (!halls.find(h => h.id === hallDef.id)) {
      halls.push({ ...hallDef, blocks: [] });
    }
  }

  return {
    id: 'c106',
    eventName: 'コミックマーケット106',
    eventCode: 'C106',
    halls,
    connections: baseConnections,
  };
}

// ─────────────────────────────────────────────
// エクスポート
// ─────────────────────────────────────────────

/** 利用可能な会場レイアウト一覧 */
export const venueLayouts: Record<string, () => VenueLayout> = {
  c105: buildC105Layout,
  c106: buildC106Layout,
};

/**
 * Retrieve the venue layout for a given event code.
 *
 * @param eventCode - Event code (e.g., 'C105' or 'c106'); lookup is case-insensitive.
 * @returns The `VenueLayout` for the specified event code, or `null` if no layout is available.
 */
export function getVenueLayout(eventCode: string): VenueLayout | null {
  const key = eventCode.toLowerCase();
  const builder = venueLayouts[key];
  return builder ? builder() : null;
}

/**
 * Get the array of base hall definitions used by the layout builders.
 *
 * @returns The array of hall definitions (each entry contains hall metadata, omitting `blocks`)
 */
export function getHallDefinitions() {
  return hallDefinitions;
}

/**
 * Lists supported venue events with their codes and display names.
 *
 * @returns An array of objects where each object has `code` (the event code) and `name` (the event display name)
 */
export function getSupportedEvents() {
  return Object.keys(venueLayouts).map(key => {
    const layout = venueLayouts[key]();
    return { code: layout.eventCode, name: layout.eventName };
  });
}

/**
 * Finds a hall and its block in a venue layout by hall label and block name.
 *
 * @param layout - The venue layout to search
 * @param hallLabel - Hall label to match (e.g., "東1")
 * @param blockName - Block name to match (e.g., "A", "あ", "ア")
 * @returns The matched `{ hall, block }` object, or `null` if no match is found
 */
export function findBlockByAddress(
  layout: VenueLayout,
  hallLabel: string,
  blockName: string,
): { hall: Hall; block: Block } | null {
  const hall = layout.halls.find(h => h.label === hallLabel);
  if (!hall) return null;

  const block = hall.blocks.find(b => b.name === blockName);
  if (!block) return null;

  return { hall, block };
}
