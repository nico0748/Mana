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

// Google Books の results から最初に画像を持つアイテムのURLを返す
function pickCoverFromGoogleBooks(items: any[]): string | null {
  for (const item of items) {
    const links = item.volumeInfo?.imageLinks;
    const url = links?.small || links?.thumbnail || links?.smallThumbnail;
    const normalized = normalizeGoogleBooksImageUrl(url);
    if (normalized) return normalized;
  }
  return null;
}

export const searchBookByTitle = async (title: string): Promise<string | null> => {
  if (!title) return null;

  // 戦略1: intitle: 完全一致検索（日本語優先）
  try {
    const res1 = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&langRestrict=ja&maxResults=5`
    );
    const data1 = await res1.json();
    if (data1.items?.length) {
      const url = pickCoverFromGoogleBooks(data1.items);
      if (url) return url;
    }
  } catch (error) {
    console.warn("Google Books intitle(ja) search failed:", error);
  }

  // 戦略2: intitle: 検索（言語制限なし）
  try {
    const res2 = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=5`
    );
    const data2 = await res2.json();
    if (data2.items?.length) {
      const url = pickCoverFromGoogleBooks(data2.items);
      if (url) return url;
    }
  } catch (error) {
    console.warn("Google Books intitle search failed:", error);
  }

  // 戦略3: フリーテキスト検索（最後の手段）
  try {
    const res3 = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=10`
    );
    const data3 = await res3.json();
    if (data3.items?.length) {
      const url = pickCoverFromGoogleBooks(data3.items);
      if (url) return url;
    }
  } catch (error) {
    console.error("Google Books full-text search failed:", error);
  }

  return null;
};
