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
    const match = decoded.match(/http:\/\/id\.ndl\.go\.jp\/class\/ndc10\/([^"\/\s<]+)/);
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

export const searchBookByTitle = async (title: string): Promise<string | null> => {
  if (!title) return null;

  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}`);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const volumeInfo = data.items[0].volumeInfo;
      return volumeInfo.imageLinks?.thumbnail || null;
    }
  } catch (error) {
    console.error("Google Books title search failed:", error);
  }
  return null;
};
