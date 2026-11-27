import { formatEntry, type LogEntry } from './log';
import {
    BOX_SELECTORS,
    type Box,
    FIT_VARIABLES,
    type FitName,
    type FlickerStats,
    type LoadSnapshot,
    type Snapshot,
    UNIT_PROBES,
    type UnitName,
} from './snapshot';

const DECIMALS = 2;
const SEPARATOR = ' | ';
const NONE = '-';

/** 最多兩個小數位；量唔到 = `-` */
export const formatNumber = (value: number | null | undefined): string =>
    value === null || value === undefined || Number.isNaN(value)
        ? NONE
        : String(Number(value.toFixed(DECIMALS)));

const size = ([width, height]: readonly [number, number]) =>
    `${formatNumber(width)}x${formatNumber(height)}`;

/** 上下邊（getBoundingClientRect top / bottom） */
const spanText = (box: Box | null) =>
    box ? `[${formatNumber(box.top)}, ${formatNumber(box.bottom)}]` : NONE;

const boxText = (name: string, box: Box | null) =>
    box ? `${name} ${formatNumber(box.height)} ${spanText(box)}` : `${name} ${NONE}`;

const vvText = ({ vv }: Snapshot) =>
    vv
        ? `vv ${size([vv.width, vv.height])} top ${formatNumber(vv.offsetTop)} pageTop ${formatNumber(vv.pageTop)} scale ${formatNumber(vv.scale)}`
        : `vv ${NONE}`;

const unitsText = ({ units }: Snapshot) =>
    `units ${(Object.keys(UNIT_PROBES) as UnitName[])
        .map((name) => `${name} ${formatNumber(units[name])}`)
        .join(SEPARATOR)}`;

const boxesText = ({ boxes }: Snapshot, names: readonly (typeof BOX_SELECTORS)[number][]) =>
    names.map((name) => boxText(name, boxes[name])).join(SEPARATOR);

const fitText = ({ fit }: Snapshot) =>
    fit
        ? `fit ${(Object.keys(FIT_VARIABLES) as FitName[])
              .map((name) => `${name} ${fit[name]}`)
              .join(SEPARATOR)}`
        : `fit ${NONE}`;

/** 一次量度 → 一行一類，手機窄畫面都睇到 */
export const formatSnapshot = (s: Snapshot): string[] => [
    `mode ${s.displayMode}${SEPARATOR}nav.standalone ${s.navStandalone}${SEPARATOR}dpr ${formatNumber(s.dpr)}`,
    `orientation ${s.orientation}${SEPARATOR}window.orientation ${s.windowOrientation}`,
    `screen ${size(s.screen)}${SEPARATOR}inner ${size(s.inner)}${SEPARATOR}client ${size(s.client)}`,
    vvText(s),
    unitsText(s),
    boxesText(s, BOX_SELECTORS.slice(0, 3)),
    boxesText(s, BOX_SELECTORS.slice(3)),
    `safe env t ${formatNumber(s.safe.top)}${SEPARATOR}r ${formatNumber(s.safe.right)}${SEPARATOR}b ${formatNumber(s.safe.bottom)}${SEPARATOR}l ${formatNumber(s.safe.left)}`,
    fitText(s),
    `key ${s.fitKey}`,
    `height ${s.stageHeight.source} ${formatNumber(s.stageHeight.height)}`,
];

export const formatFlicker = ({ keyNow, keyMax, fitNow, fitMax }: FlickerStats): string =>
    `fit key changes/s ${keyNow} (max ${keyMax})${SEPARATOR}fit applied/s ${fitNow} (max ${fitMax})`;

const heading = (label: string, { t }: Snapshot) => `[${label} @ +${Math.round(t)}ms]`;

/** 面板窄：開 app 每個時間點一行（全部數喺「複製」嘅全文） */
export const formatLoadLine = ({ label, snapshot: s }: LoadSnapshot): string =>
    [
        `${label} @+${Math.round(s.t)}ms`,
        `inner ${size(s.inner)}`,
        `dvh ${formatNumber(s.units.dvh)}`,
        `key ${s.fitKey}`,
        `.stage ${spanText(s.boxes['.stage'])}`,
    ].join(' ');

export interface Report {
    version: string;
    userAgent: string;
    live: Snapshot;
    load: readonly LoadSnapshot[];
    flicker: FlickerStats;
    log: readonly LogEntry[];
}

/** 「複製」嘅全文：而家嘅數、開 app 三個時間點、閃嘅次數、成個記錄 */
export const formatReport = ({ version, userAgent, live, load, flicker, log }: Report): string =>
    [
        `R Gram viewport diag v${version}`,
        `UA ${userAgent}`,
        heading('live', live),
        ...formatSnapshot(live),
        formatFlicker(flicker),
        ...load.flatMap(({ label, snapshot }) => [
            heading(label, snapshot),
            ...formatSnapshot(snapshot),
        ]),
        `[log ${log.length}]`,
        ...log.map(formatEntry),
    ].join('\n');
