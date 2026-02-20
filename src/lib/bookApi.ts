export interface OpenBDBook {
  isbn: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

export const fetchBookByIsbn = async (isbn: string): Promise<OpenBDBook | null> => {
  const cleanIsbn = isbn.replace(/-/g, '');
  
  // 1. Try OpenBD first (Best for Japanese books)
  try {
    const response = await fetch(`https://api.openbd.jp/v1/get?isbn=${cleanIsbn}`);
    const data = await response.json();

    if (data && data[0]) {
      const bookData = data[0];
      const summary = bookData.summary;
      return {
        isbn: summary.isbn,
        title: summary.title,
        author: summary.author,
        coverUrl: summary.cover || null,
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
      };
    }
  } catch (error) {
    console.error("Google Books fetch failed:", error);
  }

  return null;
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
