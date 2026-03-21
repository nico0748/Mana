import ImageTracer from 'imagetracerjs';

const MAX_DIMENSION = 1000;

/**
 * Load an image from a data URL into an HTMLImageElement.
 *
 * The returned promise rejects if the image fails to load.
 *
 * @param dataUrl - The image data URL to load (for example, `data:image/png;base64,...`)
 * @returns An `HTMLImageElement` representing the loaded image
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Convert a fully loaded HTMLImageElement into ImageData, downscaling it so its largest dimension does not exceed MAX_DIMENSION.
 *
 * @param img - A fully loaded HTMLImageElement (its naturalWidth/naturalHeight must be available)
 * @returns The ImageData for the image after optional downscaling
 */
function resizeToImageData(img: HTMLImageElement): ImageData {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

const VENUE_MAP_OPTIONS = {
  numberofcolors: 24, colorsampling: 2 as const, mincolorratio: 0.01, colorquantcycles: 3,
  ltres: 1, qtres: 1, pathomit: 12,
  strokewidth: 1, scale: 1, roundcoords: 1, viewbox: true, desc: false,
  blurradius: 1, blurdelta: 20,
};

/**
 * Generate an SVG string from an image provided as a data URL using ImageTracer.
 *
 * @param imageDataUrl - The image encoded as a data URL (for example `data:image/png;base64,...`)
 * @returns The traced SVG markup as a string
 */
export async function traceImageToSvg(imageDataUrl: string): Promise<string> {
  const img = await loadImage(imageDataUrl);
  const imageData = resizeToImageData(img);
  return ImageTracer.imagedataToSVG(imageData, VENUE_MAP_OPTIONS);
}
