import type { ReactNode } from 'react';

/* Icon 畫喺 48 × 48 格（設計稿 template.html ICONS）。實心部分用 fill = currentColor 嘅父層顏色；線條用 stroke */
const LINE = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
} as const;

const HEART =
    'M24 38.5S10.5 30 10.5 20.6c0-5 3.7-8.1 7.5-8.1 2.6 0 4.8 1.4 6 3.5 1.2-2.1 3.4-3.5 6-3.5 3.8 0 7.5 3.1 7.5 8.1C37.5 30 24 38.5 24 38.5z';

/** 復古電視：天線、機身（挖走螢幕同右邊三粒旋鈕）、腳 */
const RETRO_TV_BODY =
    'M10 16.5h28a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-15a4 4 0 0 1 4-4zM12.5 20.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h17a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3zM37.5 22.3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM37.5 27.6a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM37.5 32.9a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8z';

const LOOP = 'M9 23.5v-4a6.5 6.5 0 0 1 6.5-6.5H37M32 8l5 5-5 5';

export const ICON_PATHS = {
    info: (
        <>
            <circle cx="24" cy="12.5" r="3.9" />
            <path d="M17.5 20.5h10v13.5h3.5v3.2h-14v-3.2h3.6v-10.3h-3.1z" />
        </>
    ),
    heart: <path d={HEART} />,
    mv: (
        <>
            <path fillRule="evenodd" d={RETRO_TV_BODY} />
            <path d="M24 16.5L17.5 8M24 16.5L30.5 8" {...LINE} strokeWidth={2.4} />
            <circle cx="17.2" cy="7.6" r="2.3" />
            <circle cx="30.8" cy="7.6" r="2.3" />
            <path d="M11 39.5h5v2.5h-5zM32 39.5h5v2.5h-5z" />
        </>
    ),
    /** 順序：兩條向右箭咀 */
    order: <path d="M9 17h26.5M30.5 12l5 5-5 5M9 31h26.5M30.5 26l5 5-5 5" {...LINE} />,
    shuffle: (
        <path
            d="M8 15.5h6.5c7.6 0 9.9 17 17.5 17h7M34 27.5l5 5-5 5M8 32.5h6.5c2.8 0 4.8-2.3 6.6-5.3M26.4 20.8c1.7-3 3.7-5.3 6.6-5.3h6M34 10.5l5 5-5 5"
            {...LINE}
        />
    ),
    /** 全部重複：循環箭咀 */
    all: <path d={`${LOOP}M39 24.5v4a6.5 6.5 0 0 1-6.5 6.5H11M16 30l-5 5 5 5`} {...LINE} />,
    /** 單曲重複：循環箭咀 + 右下角實心數字 badge（入面挖空一個「1」） */
    one: (
        <>
            <path d={`${LOOP}M21 35H11M16 30l-5 5 5 5`} {...LINE} />
            <path
                fillRule="evenodd"
                d="M34.5 23.5a10 10 0 1 0 0 20a10 10 0 0 0 0-20zM32 30.4l3.4-2.2h1.9v11.2h-2.9v-7.6l-2.4 1.3z"
            />
        </>
    ),
} as const satisfies Record<string, ReactNode>;
