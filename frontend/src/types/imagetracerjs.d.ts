declare module 'imagetracerjs' {
  interface ImageTracerOptions {
    ltres?: number; qtres?: number; pathomit?: number;
    colorsampling?: 0 | 1 | 2; numberofcolors?: number;
    mincolorratio?: number; colorquantcycles?: number;
    strokewidth?: number; linefilter?: boolean; scale?: number;
    roundcoords?: number; viewbox?: boolean; desc?: boolean;
    lcpr?: number; qcpr?: number; blurradius?: number; blurdelta?: number;
  }
  interface ImageTracerStatic {
    imagedataToSVG(imageData: ImageData, options?: ImageTracerOptions): string;
    imageToSVG(url: string, cb: (svgStr: string) => void, options?: ImageTracerOptions): void;
    optionpresets: Record<string, ImageTracerOptions>;
  }
  const ImageTracer: ImageTracerStatic;
  export default ImageTracer;
}
