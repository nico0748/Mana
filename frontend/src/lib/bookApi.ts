export interface OpenBDBook {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string | null;
  ndcCode: string | null;
}

// NDL（国立国会図書館）SRU API から NDC コードを取得
const fetchNdcByIsbn = async (isbn: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://ndlsearch.ndl.go.jp/api/sru?operation=searchRetrieve&recordSchema=dcndl&maximumRecords=1&query=isbn%3D${isbn}`
    );
    const xml = await response.text();
    // レスポンス内はHTMLエスケープされているのでデコード
    const decoded = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    // NDC10 クラスURL からコードを抽出: http://id.ndl.go.jp/class/ndc10/{CODE}
    const match = decoded.match(/http:\/\/id\.ndl\.go\.jp\/class\/ndc10\/([^"\/\s<]+)/); // eslint-disable-line no-useless-escape
    if (match) {
      // 全角ピリオド（．）を半角に正規化
      return match[1].replace(/．/g, '.');
    }
  } catch (error) {
    console.warn('NDL API fetch failed:', error);
  }
  return null;
};

export const fetchBookByIsbn = async (isbn: string): Promise<OpenBDBook | null> => {
  const cleanIsbn = isbn.replace(/-/g, '');

  // 書誌情報取得と NDC 取得を並行実行
  const ndcPromise = fetchNdcByIsbn(cleanIsbn);

  // 1. Try OpenBD first (Best for Japanese books)
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
    console.warn("OpenBD fetch failed, trying fallback...", error);
  }

  // 2. Fallback to Google Books API
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const volumeInfo = data.items[0].volumeInfo;
      return {
        isbn: cleanIsbn,
        title: volumeInfo.title,
        author: volumeInfo.authors ? volumeInfo.authors.join(', ') : '',
        coverUrl: volumeInfo.imageLinks?.thumbnail || null,
        ndcCode: await ndcPromise,
      };
    }
  } catch (error) {
    console.error("Google Books fetch failed:", error);
  }

  return null;
};

// Google Books のサムネイルURLをhttpsに正規化し、より大きい画像を取得する
function normalizeGoogleBooksImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  // http → https に統一、zoom=0(thumbnail) → zoom=1(small) に変更
  return url.replace(/^http:\/\//, 'https://').replace(/zoom=\d/, 'zoom=1');
}

// タイトルから表紙画像を取得する。
//
// 旧実装は `intitle:` 完全一致 → `intitle:` 言語無制限 → フリーテキスト の3段階フォールバックで、
// さらに各段階で「最初に画像のあるアイテム」を選んでいた。これだと検索順位が下位の別シリーズ・別巻が
// 引っ張られて精度が悪くなるケースが多かった。
//
// 新実装はシンプルに「**Google Books で検索した最上位ヒットの表紙**をそのまま使う」方針。
// 最上位に表紙画像が無い場合はあきらめて null を返し、ユーザーに手動アップロードを促す。
export const searchBookByTitle = async (title: string): Promise<string | null> => {
  const q = title.trim();
  if (!q) return null;

  try {
    // langRestrict=ja は日本語タイトルのヒット精度を上げるため残す。
    // q= に intitle: を付けないことで、Google Books 側の関連度ランキングを最大限に活用する。
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=ja&maxResults=1`
    );
    const data = await res.json();
    const top = data?.items?.[0];
    if (!top) return null;
    const links = top.volumeInfo?.imageLinks;
    const url = links?.small || links?.thumbnail || links?.smallThumbnail;
    return normalizeGoogleBooksImageUrl(url);
  } catch (error) {
    console.error('Google Books title search failed:', error);
    return null;
  }
};
