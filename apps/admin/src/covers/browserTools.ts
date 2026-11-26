/*
 * ImageTools 嘅瀏覽器版：createImageBitmap decode；canvas 畫（imageSmoothingQuality = 'high'，放大都用佢，D50）；
 * canvas.toBlob 出 WebP。Safari 嘅 canvas 唔識出 WebP（靜靜雞出 PNG）：見到唔係 WebP 就 lazy load
 * @jsquash/webp（libwebp wasm）再編碼（Technical Spec「Tech Stack → 管理端元件」）
 */
import type { DecodedImage, ImageTools, RenderRequest } from './processCover';
import { PERCENT, WEBP_QUALITY, WEBP_TYPE } from './limits';

export interface CanvasDeps {
    createCanvas: (width: number, height: number) => HTMLCanvasElement;
    decode: (source: Blob) => Promise<DecodedImage>;
    wasmEncode: (data: ImageData) => Promise<ArrayBuffer>;
}

const DECODE_OPTIONS: ImageBitmapOptions = { imageOrientation: 'from-image' };

const wasmEncode = async (data: ImageData): Promise<ArrayBuffer> => {
    const { default: encode } = await import('@jsquash/webp/encode');
    return encode(data, { quality: WEBP_QUALITY * PERCENT });
};

export const browserDeps: CanvasDeps = {
    createCanvas: (width, height) =>
        Object.assign(document.createElement('canvas'), { width, height }),
    // 明寫跟 EXIF 方向轉正：而家瀏覽器預設已經係咁，明寫避開舊 Safari 同將來預設改動（S-228）
    decode: (source) => createImageBitmap(source, DECODE_OPTIONS),
    wasmEncode,
};

const nativeBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, WEBP_TYPE, WEBP_QUALITY));

const encodeWebp = async (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    encode: CanvasDeps['wasmEncode'],
): Promise<Blob> => {
    const native = await nativeBlob(canvas);
    if (native?.type === WEBP_TYPE) return native;
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    return new Blob([await encode(data)], { type: WEBP_TYPE });
};

const render = async (deps: CanvasDeps, image: DecodedImage, request: RenderRequest) => {
    const { crop, side, withPixels } = request;
    const canvas = deps.createCanvas(side, side);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is not available');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const source = image as unknown as CanvasImageSource;
    context.drawImage(source, crop.x, crop.y, crop.side, crop.side, 0, 0, side, side);
    const pixels = withPixels ? context.getImageData(0, 0, side, side).data : undefined;
    return { blob: await encodeWebp(canvas, context, deps.wasmEncode), pixels };
};

export const browserTools = (deps: CanvasDeps = browserDeps): ImageTools => ({
    decode: (source) => deps.decode(source),
    render: (image, request) => render(deps, image, request),
});
