import type { ManaClient } from './client.js';

export interface CoverCandidate {
  title: string;
  author?: string;
  isbn?: string;
  coverUrl: string;
  source: 'rakuten' | 'openbd' | 'googleBooks';
}

/** OpenBD: ISBN が判明しているときだけ引ける。書影の質が安定している。 */
async function openBdCovers(isbns: string[]): Promise<Map<string, string>> {
  const cleaned = Array.from(new Set(isbns.map(i => i.replace(/-/g, '').trim()).filter(Boolean)));
  const map = new Map<string, string>();
  if (cleaned.length === 0) return map;

  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${cleaned.join(',')}`);
    if (!res.ok) return map;
    const data = (await res.json()) as Array<{ summary?: { isbn?: string; cover?: string } } | null>;
    for (const item of data ?? []) {
      const isbn = item?.summary?.isbn;
      const cover = item?.summary?.cover;
      if (isbn && cover) map.set(isbn, cover);
    }
  } catch {
    // 書影は付加情報なので、取得できなくても検索自体は成立させる
  }
  return map;
}

/** Google Books: 日本語の精度は落ちるが、楽天が使えないときの保険になる。 */
async function googleBooksCovers(title: string, limit: number): Promise<CoverCandidate[]> {
  try {
    const url =
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:${title}`)}` +
      `&maxResults=${limit}&country=JP`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = (await res.json()) as {
      items?: Array<{
        volumeInfo?: {
          title?: string;
          authors?: string[];
          imageLinks?: { thumbnail?: string; smallThumbnail?: string };
          industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
        };
      }>;
    };

    return (data.items ?? []).flatMap(item => {
      const info = item.volumeInfo;
      const raw = info?.imageLinks?.thumbnail ?? info?.imageLinks?.smallThumbnail;
      if (!info?.title || !raw) return [];
      const isbn13 = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier;
      return [{
        title: info.title,
        author: info.authors?.join(', '),
        isbn: isbn13,
        // Google Books のサムネイルは http で返ることがあるため https に寄せる
        coverUrl: raw.replace(/^http:/, 'https:'),
        source: 'googleBooks' as const,
      }];
    });
  } catch {
    return [];
  }
}

/**
 * タイトルから書影 URL の候補を集める。
 *
 * 注意: ここで引けるのは商業出版物のデータベース（楽天ブックス / OpenBD / Google Books）
 * だけで、同人誌は基本的に登録されていない。同人誌の書影は X の投稿画像など
 * 別の経路で URL を得る必要がある。
 */
export async function searchBookCovers(
  client: ManaClient,
  title: string,
  limit = 5,
): Promise<CoverCandidate[]> {
  const results: CoverCandidate[] = [];

  // 1) 楽天ブックス（アプリの公開プロキシ経由）。日本語のヒット率が最も高い。
  const rakuten = await client.searchRakuten(title).catch(() => []);
  for (const item of rakuten) {
    const cover = item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl;
    if (!item.title || !cover) continue;
    results.push({
      title: item.title,
      author: item.author,
      isbn: item.isbn,
      // 楽天の画像 URL は末尾の ?_ex=NNxNN でサイズが決まる。大きめに寄せる。
      coverUrl: cover.replace(/\?_ex=\d+x\d+$/, '?_ex=300x300'),
      source: 'rakuten',
    });
  }

  // 2) 楽天で得た ISBN を OpenBD で引き直し、書影が無かったものを補う
  const missing = results.filter(r => !r.coverUrl && r.isbn).map(r => r.isbn!);
  if (missing.length) {
    const covers = await openBdCovers(missing);
    for (const r of results) {
      if (!r.coverUrl && r.isbn && covers.has(r.isbn)) {
        r.coverUrl = covers.get(r.isbn)!;
        r.source = 'openbd';
      }
    }
  }

  // 3) 楽天が使えない / ヒット 0 のときだけ Google Books に落とす
  if (results.length === 0) {
    results.push(...(await googleBooksCovers(title, limit)));
  }

  // 同じ書影 URL の重複を落とす
  const seen = new Set<string>();
  return results
    .filter(r => r.coverUrl && !seen.has(r.coverUrl) && seen.add(r.coverUrl))
    .slice(0, limit);
}
