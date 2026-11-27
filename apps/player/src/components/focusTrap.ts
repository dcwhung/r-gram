/*
 * 舞台入面嘅 Tab 兜圈（WCAG 2.1 AA；review S-074）：弧線歌單（T-037）同歌書（T-072）開住時共用。
 * 下面俾暗層蓋住嘅掣已經 `tabindex="-1"`（SVG 冇 `inert`），所以呢度只係喺仲 Tab 得到嘅嘢之間轉。
 */
const TAB_STOPS = '[tabindex="0"]';

/** 讀屏睇得到（唔喺 aria-hidden / inert 入面） */
const isReachable = (element: Element): boolean =>
    element.closest('[aria-hidden="true"], [inert]') === null;

/** Tab 喺舞台入面兜圈：最後一個之後返第一個，反之亦然 */
export const trapTab = (root: SVGGElement | null, event: KeyboardEvent): void => {
    const stage = root?.ownerSVGElement;
    if (!stage) return;
    const stops = [...stage.querySelectorAll<SVGElement>(TAB_STOPS)].filter(isReachable);
    if (stops.length === 0) return;
    const at = stops.findIndex((stop) => stop === document.activeElement);
    const step = event.shiftKey ? -1 : 1;
    const from = at === -1 && event.shiftKey ? 0 : at;
    const next = stops[(from + step + stops.length) % stops.length];
    event.preventDefault();
    next?.focus();
};
