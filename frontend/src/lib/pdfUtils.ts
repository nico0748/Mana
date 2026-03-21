import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

/**
 * Render a single page from a PDF File to a PNG data URL.
 *
 * @param file - The PDF file to render
 * @param pageNumber - The 1-based page number to render (default: 1)
 * @param scale - The scale factor applied to the page viewport (default: 2)
 * @returns An object containing `dataUrl`, the PNG data URL of the rendered page, and `totalPages`, the document's page count
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
