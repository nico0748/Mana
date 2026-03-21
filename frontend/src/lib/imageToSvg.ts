import ImageTracer from 'imagetracerjs';

const MAX_DIMENSION = 1000;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

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

export async function traceImageToSvg(imageDataUrl: string): Promise<string> {
  const img = await loadImage(imageDataUrl);
  const imageData = resizeToImageData(img);
  return ImageTracer.imagedataToSVG(imageData, VENUE_MAP_OPTIONS);
}
