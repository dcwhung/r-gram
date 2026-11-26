/* 電視自己嘅漸層同濾鏡嘅 id 同數值（同設計稿 template.html <defs>「MV 電視」一樣）；畫喺 TvDefs */
export const TV_DEF = {
    shellOuter: 'rg-tv-shell-outer',
    shellIn: 'rg-tv-shell-in',
    shellFace: 'rg-tv-shell-face',
    front: 'rg-tv-front',
    mask: ['rg-tv-mask-0', 'rg-tv-mask-1', 'rg-tv-mask-2'],
    tube: 'rg-tv-tube',
    glare: 'rg-tv-glare',
    vignette: 'rg-tv-vignette',
    panel: 'rg-tv-panel',
    panelEdge: 'rg-tv-panel-edge',
    cylinderH: 'rg-tv-cylinder-h',
    legTip: 'rg-tv-leg-tip',
    legShade: 'rg-tv-leg-shade',
    scan: 'rg-tv-scan',
    inner: 'rg-tv-inner',
    shadowXL: 'rg-tv-shadow-xl',
    glassClip: 'rg-tv-glass-clip',
} as const;

export const tvRef = (id: string): string => `url(#${id})`;

export type Stop = readonly [offset: string, colour: string, opacity?: string];

const DIAGONAL = '1 1';
const DOWN = '0 1';
const ACROSS = '1 0';

export const LINEARS: readonly { id: string; to: string; stops: readonly Stop[] }[] = [
    {
        id: TV_DEF.shellOuter,
        to: DIAGONAL,
        stops: [
            ['0', '#ffffff'],
            ['1', '#989ba2'],
        ],
    },
    {
        id: TV_DEF.shellIn,
        to: DIAGONAL,
        stops: [
            ['0', '#8b8e95'],
            ['1', '#f7f8f9'],
        ],
    },
    {
        id: TV_DEF.shellFace,
        to: DOWN,
        stops: [
            ['0', '#f4f5f6'],
            ['1', '#d3d5d9'],
        ],
    },
    {
        id: TV_DEF.front,
        to: DOWN,
        stops: [
            ['0', '#2a2b2f'],
            ['1', '#141416'],
        ],
    },
    {
        id: TV_DEF.mask[0],
        to: DIAGONAL,
        stops: [
            ['0', '#fbfaf6'],
            ['1', '#c4c1b8'],
        ],
    },
    {
        id: TV_DEF.mask[1],
        to: DIAGONAL,
        stops: [
            ['0', '#d8d5cc'],
            ['1', '#f6f4ee'],
        ],
    },
    {
        id: TV_DEF.mask[2],
        to: DOWN,
        stops: [
            ['0', '#c9c6bd'],
            ['1', '#ebe8e1'],
        ],
    },
    {
        id: TV_DEF.glare,
        to: '.55 .75',
        stops: [
            ['0', '#fff', '.24'],
            ['.4', '#fff', '.04'],
            ['1', '#fff', '0'],
        ],
    },
    {
        id: TV_DEF.panel,
        to: DIAGONAL,
        stops: [
            ['0', '#34363b'],
            ['1', '#1b1c1f'],
        ],
    },
    {
        id: TV_DEF.panelEdge,
        to: DIAGONAL,
        stops: [
            ['0', '#fff', '.55'],
            ['1', '#fff', '.12'],
        ],
    },
    {
        id: TV_DEF.cylinderH,
        to: ACROSS,
        stops: [
            ['0', '#7c7c7c'],
            ['.24', '#f7f7f7'],
            ['.56', '#b3b3b3'],
            ['.86', '#868686'],
            ['1', '#565656'],
        ],
    },
    {
        id: TV_DEF.legTip,
        to: ACROSS,
        stops: [
            ['0', '#0b0b0c'],
            ['.26', '#4a4b50'],
            ['.6', '#1b1c1f'],
            ['1', '#050505'],
        ],
    },
];
