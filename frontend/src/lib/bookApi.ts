// 書籍検索 API クライアント
//
// 書籍メタデータと表紙画像の取得は、日本語書籍に強い順に **NDL Search → OpenBD → Google Books** の
// 三段階戦略で行う。Google Books は日本語書誌（特にライトノベル / マンガ / 同人誌）の網羅性が低く、
// 旧実装（Google 単独）では「全くヒットしない」「別の本の表紙が出る」問題があった。
//
//   1. NDL Search SRU API … 国立国会図書館の書誌データベース。納本制度に基づく日本語出版物のほぼ全件
//      を網羅。タイトル・著者・ISBN・出版社・出版日・NDC を返す。表紙は無し。
//   2. OpenBD … 日本の流通書籍向けの書誌＋表紙データベース。ISBN 指定でカバー画像を取得できる。
//   3. Google Books … NDL に無い書籍（最新刊 / 海外書籍 / 一部ライトノベル）の保険。

export interface OpenBDBook {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string | null;
  ndcCode: string | null;
}

// ─── ヘルパ: Google Books サムネイルの正規化 ─────────────────────────────────
function normalizeGoogleBooksImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  return url.replace(/^http:\/\//, 'https://').replace(/zoom=\d/, 'zoom=1');
}

// ─── ヘルパ: NDL Search SRU API のパース ───────────────────────────────────
//
// NDL の SRU レスポンスは外側 XML の中にレコード XML が text として入っている（HTML エスケープ済）。
// HTMLエンティティを decode してから DOMParser で再パースする。

interface NdlRecord {
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  publishedDate: string | null;
  ndcCode: string | null;
}

function pickInnerText(parent: Element, localName: string): string | null {
  const els = parent.getElementsByTagNameNS('*', localName);
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    // <rdf:value> や <foaf:name> のような入れ子がよくあるので優先採用する
    const value = el.getElementsByTagNameNS('*', 'value')[0];
    if (value?.textContent) {
      const t = value.textContent.trim();
      if (t) return t;
    }
    const name = el.getElementsByTagNameNS('*', 'name')[0];
    if (name?.textContent) {
      const t = name.textContent.trim();
      if (t) return t;
    }
    // 入れ子要素を持たない leaf の場合は直接テキストを採用
    const hasChildElements = Array.from(el.children).some(c => c.nodeType === 1);
    if (!hasChildElements) {
      const t = el.textContent?.trim();
      if (t) return t;
    }
  }
  return null;
}

function parseNdlXml(xml: string): NdlRecord[] {
  // 内側 XML が text-encoded で埋め込まれているので、まず entity を全部 decode する
  const decoded = xml
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(decoded, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
  } catch {
    return [];
  }

  const resources = doc.getElementsByTagNameNS('*', 'BibResource');
  const out: NdlRecord[] = [];

  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];

    const title = pickInnerText(r, 'title');
    if (!title) continue;

    const author = pickInnerText(r, 'creator') ?? '';
    const publisher = pickInnerText(r, 'publisher');
    const publishedDate = pickInnerText(r, 'issued') ?? pickInnerText(r, 'date');

    // ISBN: <dcterms:identifier rdf:datatype="http://ndl.go.jp/dcndl/terms/ISBN">9784xxx</dcterms:identifier>
    let isbn: string | null = null;
    const ids = r.getElementsByTagNameNS('*', 'identifier');
    for (let j = 0; j < ids.length; j++) {
      const id = ids[j];
      const dt =
        id.getAttributeNS('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'datatype') ??
        id.getAttribute('rdf:datatype') ??
        '';
      if (dt.includes('ISBN')) {
        const val = id.textContent?.trim();
        if (val && /^\d/.test(val)) {
          isbn = val.replace(/-/g, '');
          break;
        }
      }
    }

    // NDC: <dcterms:subject rdf:resource="http://id.ndl.go.jp/class/ndc10/913.6"/>
    let ndcCode: string | null = null;
    const ndcMatch = r.outerHTML.match(/http:\/\/id\.ndl\.go\.jp\/class\/ndc10\/([^"\s<]+)/);
    if (ndcMatch) {
      ndcCode = ndcMatch[1].replace(/．/g, '.');
    }

    out.push({ title, author, isbn, publisher, publishedDate, ndcCode });
  }
  return out;
}

async function searchNdlByTitle(title: string, max: number): Promise<NdlRecord[]> {
  // CQL: title="..." はフレーズ一致検索。クエリ自体に " が混入すると壊れるので除去。
  const cql = `title="${title.replace(/["\\]/g, '')}"`;
  const url =
    `https://ndlsearch.ndl.go.jp/api/sru?operation=searchRetrieve&recordSchema=dcndl` +
    `&maximumRecords=${Math.min(200, max)}&query=${encodeURIComponent(cql)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseNdlXml(xml);
  } catch (e) {
    console.warn('NDL Search failed:', e);
    return [];
  }
}

// ─── ヘルパ: OpenBD カバー一括取得 ─────────────────────────────────────────
//
// OpenBD は ?isbn=A,B,C,... のカンマ区切りで一括取得が可能（最大数百件まで OK）。
// 1 リクエストで複数表紙を引けるので、N 個の ISBN に対して N 並列より圧倒的に効率的。

async function fetchOpenBdCovers(isbns: string[]): Promise<Map<string, string>> {
  const cleaned = Array.from(new Set(
    isbns.map(i => i.replace(/-/g, '').trim()).filter(i => i.length > 0),
  ));
  const map = new Map<string, string>();
  if (cleaned.length === 0) return map;
  try {
    const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${cleaned.join(',')}`);
    if (!res.ok) return map;
    const data = await res.json();
    if (Array.isArray(data)) {
      for (const item of data) {
        const isbn = item?.summary?.isbn;
        const cover = item?.summary?.cover;
        if (isbn && cover) map.set(String(isbn), String(cover));
      }
    }
  } catch (e) {
    console.warn('OpenBD batch cover fetch failed:', e);
  }
  return map;
}

// ─── 公開: ISBN → 書籍情報（OpenBD → Google Books） ────────────────────────

// NDL（国立国会図書館）SRU API から ISBN で NDC コードを取得（後方互換）
const fetchNdcByIsbn = async (isbn: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://ndlsearch.ndl.go.jp/api/sru?operation=searchRetrieve&recordSchema=dcndl&maximumRecords=1&query=isbn%3D${isbn}`
    );
    const xml = await response.text();
    const decoded = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const match = decoded.match(/http:\/\/id\.ndl\.go\.jp\/class\/ndc10\/([^"\/\s<]+)/); // eslint-disable-line no-useless-escape
    if (match) return match[1].replace(/．/g, '.');
  } catch (error) {
    console.warn('NDL API fetch failed:', error);
  }
  return null;
};

export const fetchBookByIsbn = async (isbn: string): Promise<OpenBDBook | null> => {
  const cleanIsbn = isbn.replace(/-/g, '');
  const ndcPromise = fetchNdcByIsbn(cleanIsbn);

  // 1. OpenBD（日本の書籍に最も強い）
  try {
    const response = await fetch(`https://api.openbd.jp/v1/get?isbn=${cleanIsbn}`);
    const data = await response.json();
    if (data && data[0]) {
      const summary = data[0].summary;
      return {
        isbn: summary.isbn,
        title: summary.title,
        author: summary.author,
        coverUrl: summary.cover || null,
        ndcCode: await ndcPromise,
      };
    }
  } catch (error) {
    console.warn('OpenBD fetch failed, trying fallback...', error);
  }

  // 2. Google Books fallback
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const volumeInfo = data.items[0].volumeInfo;
      return {
        isbn: cleanIsbn,
        title: volumeInfo.title,
        author: volumeInfo.authors ? volumeInfo.authors.join(', ') : '',
        coverUrl: normalizeGoogleBooksImageUrl(volumeInfo.imageLinks?.thumbnail),
        ndcCode: await ndcPromise,
      };
    }
  } catch (error) {
    console.error('Google Books fetch failed:', error);
  }

  return null;
};

// ─── 公開: タイトル → 候補リスト（NDL → OpenBD → Google Books） ────────────

export interface BookSearchResult {
  /** 選択状態の安定 ID。NDL ヒットなら ISBN（または title hash）、Google ヒットなら volume id。 */
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  publisher?: string;
  publishedDate?: string;
  /** ヒット元: 'ndl' / 'google' （UI でバッジ表示等に使用） */
  source?: 'ndl' | 'google';
}

async function searchGoogleBooks(title: string, maxResults: number): Promise<BookSearchResult[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&langRestrict=ja&maxResults=${Math.min(40, maxResults)}`,
    );
    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    return items
      .map((item: any): BookSearchResult | null => {
        const v = item?.volumeInfo ?? {};
        if (!v.title) return null;
        const isbn = (v.industryIdentifiers ?? [])
          .find((id: any) => id?.type === 'ISBN_13' || id?.type === 'ISBN_10')?.identifier;
        const rawCover =
          v.imageLinks?.small || v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
        return {
          id: item.id ?? `${v.title}-${isbn ?? Math.random()}`,
          title: v.title,
          author: Array.isArray(v.authors) ? v.authors.join(', ') : '',
          isbn: typeof isbn === 'string' ? isbn : undefined,
          coverUrl: normalizeGoogleBooksImageUrl(rawCover) ?? undefined,
          publisher: typeof v.publisher === 'string' ? v.publisher : undefined,
          publishedDate: typeof v.publishedDate === 'string' ? v.publishedDate : undefined,
          source: 'google',
        };
      })
      .filter((b): b is BookSearchResult => b !== null);
  } catch (e) {
    console.error('Google Books bulk search failed:', e);
    return [];
  }
}

export const searchBooksByTitle = async (
  title: string,
  maxResults = 30,
): Promise<BookSearchResult[]> => {
  const q = title.trim();
  if (!q) return [];

  // NDL を優先取得
  const ndl = await searchNdlByTitle(q, maxResults * 2); // ISBN ダブり対策で多めに取って後でユニーク化

  // ISBN ベースで重複排除（同じ本の複数版が並ぶことがあるため）
  const seenIsbn = new Set<string>();
  const seenTitleAuthor = new Set<string>();
  const dedupedNdl: NdlRecord[] = [];
  for (const r of ndl) {
    const key = r.isbn ?? `${r.title}|${r.author}`;
    if (r.isbn) {
      if (seenIsbn.has(r.isbn)) continue;
      seenIsbn.add(r.isbn);
    } else {
      if (seenTitleAuthor.has(key)) continue;
      seenTitleAuthor.add(key);
    }
    dedupedNdl.push(r);
    if (dedupedNdl.length >= maxResults) break;
  }

  if (dedupedNdl.length > 0) {
    // OpenBD で表紙を一括取得
    const isbnList = dedupedNdl.map(r => r.isbn).filter((s): s is string => !!s);
    const coverMap = await fetchOpenBdCovers(isbnList);

    return dedupedNdl.map((r): BookSearchResult => ({
      id: r.isbn ?? `ndl-${r.title}-${r.author}`,
      title: r.title,
      author: r.author,
      isbn: r.isbn ?? undefined,
      coverUrl: r.isbn ? coverMap.get(r.isbn) : undefined,
      publisher: r.publisher ?? undefined,
      publishedDate: r.publishedDate ?? undefined,
      source: 'ndl',
    }));
  }

  // NDL でゼロヒットなら Google Books にフォールバック
  return searchGoogleBooks(q, maxResults);
};

// ─── 公開: タイトル → 表紙画像 URL（NDL+OpenBD → Google Books） ────────────

export const searchBookByTitle = async (title: string): Promise<string | null> => {
  const q = title.trim();
  if (!q) return null;

  // NDL の最上位ヒットから ISBN を引いて、OpenBD で表紙を取得する。
  // OpenBD は流通書籍の表紙ソースとして最も信頼できる。
  const ndl = await searchNdlByTitle(q, 5);
  const isbns = ndl.map(r => r.isbn).filter((s): s is string => !!s);
  if (isbns.length > 0) {
    const covers = await fetchOpenBdCovers(isbns);
    // NDL の出力順（=関連度順）の最初に表紙が見つかったものを採用
    for (const isbn of isbns) {
      const cover = covers.get(isbn);
      if (cover) return cover;
    }
  }

  // OpenBD で表紙が見つからなかった or NDL がヒットしなかった場合 → Google Books に問い合わせ
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=ja&maxResults=1`,
    );
    const data = await res.json();
    const top = data?.items?.[0];
    if (top) {
      const links = top.volumeInfo?.imageLinks;
      const url = normalizeGoogleBooksImageUrl(
        links?.small || links?.thumbnail || links?.smallThumbnail,
      );
      if (url) return url;
    }
  } catch (e) {
    console.warn('Google Books fallback search failed:', e);
  }

  return null;
};
