/*
 * 一張封面來源 → 上載用嘅兩張圖（Technical Spec「管理端（T-055）點樣行」、API-050；Functional Spec D74、D50）：
 * decode → 置中裁正方形 → 1200（細過就放大）同 320 → WebP → 第一張由縮圖抽專輯色（`dominantColor()`）。
 * canvas 部分喺 ImageTools 後面（browserTools.ts），呢度係純流程，可以用假嘅 tools 測
 */
import {
    COVER_SIDE_PX,
    dominantColor,
    IMAGE_MAX_BYTES,
    NEUTRAL_ACCENT,
    THUMB_SIDE_PX,
} from '@r-gram/catalog';
import { CoverError } from './coverError';
import { coverPlan, type Size, type SquareCrop } from './coverPlan';
import { SOURCE_MAX_EDGE_PX } from './limits';

export interface DecodedImage extends Size {
    close: () => void;
}

export interface RenderRequest {
    crop: SquareCrop;
    /** 輸出正方形邊長 */
    side: number;
    /** 要唔要畫好之後嘅 RGBA pixel（抽專輯色） */
    withPixels: boolean;
}

export interface RenderedImage {
    blob: Blob;
    pixels?: ArrayLike<number>;
}

export interface ImageTools {
    decode: (source: Blob) => Promise<DecodedImage>;
    render: (image: DecodedImage, request: RenderRequest) => Promise<RenderedImage>;
}

export interface ProcessedCover {
    cover: Blob;
    thumb: Blob;
    /** 只喺第一張封面（D69） */
    accent?: string;
    notSquare: boolean;
    upscaled: boolean;
    source: Size;
}

const decodeChecked = async (source: Blob, tools: ImageTools): Promise<DecodedImage> => {
    let image: DecodedImage;
    try {
        image = await tools.decode(source);
    } catch {
        throw new CoverError('COVER_DECODE_FAILED');
    }
    if (Math.max(image.width, image.height) <= SOURCE_MAX_EDGE_PX) return image;
    image.close();
    throw new CoverError('COVER_SOURCE_TOO_LARGE');
};

const renderChecked = async (tools: ImageTools, image: DecodedImage, request: RenderRequest) => {
    let rendered: RenderedImage;
    try {
        rendered = await tools.render(image, request);
    } catch {
        throw new CoverError('COVER_ENCODE_FAILED');
    }
    if (rendered.blob.size > IMAGE_MAX_BYTES) throw new CoverError('COVER_OUTPUT_TOO_LARGE');
    return rendered;
};

const renderBoth = async (tools: ImageTools, image: DecodedImage, accent: boolean) => {
    const { crop, notSquare, upscaled } = coverPlan(image);
    const cover = await renderChecked(tools, image, {
        crop,
        side: COVER_SIDE_PX,
        withPixels: false,
    });
    const thumb = await renderChecked(tools, image, {
        crop,
        side: THUMB_SIDE_PX,
        withPixels: accent,
    });
    const colour = accent
        ? thumb.pixels
            ? dominantColor(thumb.pixels)
            : NEUTRAL_ACCENT
        : undefined;
    const source = { width: image.width, height: image.height };
    const result = { cover: cover.blob, thumb: thumb.blob, notSquare, upscaled, source };
    return colour === undefined ? result : { ...result, accent: colour };
};

/** accent：第一張封面先抽專輯色 */
export const processCover = async (
    source: Blob,
    tools: ImageTools,
    { accent }: { accent: boolean },
): Promise<ProcessedCover> => {
    const image = await decodeChecked(source, tools);
    try {
        return await renderBoth(tools, image, accent);
    } finally {
        image.close();
    }
};
