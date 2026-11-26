/*
 * 封面點裁（Functional Spec D74、D50）：置中裁成正方形（冇手動調位）；邊長細過 1200 = 會放大（提示，唔擋）
 */
import { COVER_SIDE_PX } from '@r-gram/catalog';

export interface Size {
    width: number;
    height: number;
}

/** 原圖入面嘅正方形（px） */
export interface SquareCrop {
    x: number;
    y: number;
    side: number;
}

export interface CoverPlan {
    crop: SquareCrop;
    /** 原圖唔係正方形：裁走咗兩邊（API-017 notSquare → 檢查結果 COVER_NOT_SQUARE） */
    notSquare: boolean;
    /** 正方形邊長細過大封面：放大到 1200（D50） */
    upscaled: boolean;
}

const HALF = 2;

export const coverPlan = ({ width, height }: Size): CoverPlan => {
    const side = Math.min(width, height);
    const crop = {
        x: Math.floor((width - side) / HALF),
        y: Math.floor((height - side) / HALF),
        side,
    };
    return { crop, notSquare: width !== height, upscaled: side < COVER_SIDE_PX };
};
