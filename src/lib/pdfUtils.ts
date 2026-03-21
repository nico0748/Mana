import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

/**
 * Renders a specific page of a PDF File to a PNG data URL and returns it with the document's page count.
 *
 * @param file - The PDF File to read and render.
 * @param pageNumber - 1-based index of the page to render (defaults to 1).
 * @param scale - Rendering scale factor applied to the page viewport (defaults to 2).
 * @returns An object containing `dataUrl`, a PNG data URL of the rendered page, and `totalPages`, the number of pages in the PDF.
 */
export async function renderPdfPageToDataUrl(
  file: File,
  pageNumber: number = 1,
  scale: number = 2,
): Promise<{ dataUrl: string; totalPages: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return { dataUrl: canvas.toDataURL('image/png'), totalPages: pdf.numPages };
}
