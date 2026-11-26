/*
 * 手機打橫時將直向舞台反方向轉 90°（Functional Spec D96；Technical Spec「CR-009 → 手機打橫轉返」）。
 * spike 版：T-111 會喺 `stage/rotation.ts` 做正式版。目標：畫面嘅頂永遠喺手機實際嘅頂。
 */

export type QuarterTurn = -90 | 0 | 90;
/** spike 可以強制方向，睇 `screen.orientation.angle` 估得啱唔啱 */
export type TurnChoice = 'auto' | -90 | 90;

const FULL_TURN = 360;
const ANGLE_FOR_PLUS = 270;

/** 90 → −90；270（或 −90）→ +90；讀唔到當 90 */
export const quarterTurn = (angle: number | null): QuarterTurn => {
    if (angle === null || !Number.isFinite(angle)) return -90;
    const normal = ((angle % FULL_TURN) + FULL_TURN) % FULL_TURN;
    return normal === ANGLE_FOR_PLUS ? 90 : -90;
};

export interface TurnInput {
    width: number;
    height: number;
    angle: number | null;
    force: TurnChoice;
}

export const turnFor = ({ width, height, angle, force }: TurnInput): QuarterTurn => {
    if (width <= height) return 0;
    return force === 'auto' ? quarterTurn(angle) : force;
};

export interface StageBox {
    width: number;
    height: number;
    transform: string;
}

/**
 * 舞台（`position: fixed`、`transform-origin: 0 0`）嘅大細同 transform：轉咗之後啱啱填滿 viewport。
 * −90：轉完喺 viewport 上面 → 向下移一個 viewport 高；+90：轉完喺左面 → 向右移一個 viewport 闊
 */
export const stageBox = (turn: QuarterTurn, width: number, height: number): StageBox => {
    if (turn === 0) return { width, height, transform: 'none' };
    const shift = turn === -90 ? `translate(0px, ${height}px)` : `translate(${width}px, 0px)`;
    return { width: height, height: width, transform: `${shift} rotate(${turn}deg)` };
};

export interface Viewport {
    width: number;
    height: number;
}

/** 手指喺 viewport 嘅位置 → 舞台座標（直向，左上 = 0,0） */
export const toStagePoint = (
    turn: QuarterTurn,
    viewport: Viewport,
    clientX: number,
    clientY: number,
): { x: number; y: number } => {
    if (turn === -90) return { x: viewport.height - clientY, y: clientX };
    if (turn === 90) return { x: clientY, y: viewport.width - clientX };
    return { x: clientX, y: clientY };
};

/** 手指移動 → 舞台方向嘅移動（`+ 0`：唔好有 −0） */
export const stageDelta = (turn: QuarterTurn, dx: number, dy: number) => {
    if (turn === -90) return { dx: -dy + 0, dy: dx + 0 };
    if (turn === 90) return { dx: dy + 0, dy: -dx + 0 };
    return { dx, dy };
};
