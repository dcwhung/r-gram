/*
 * R Gram — a fan-made RubberBand album player. Motion preview, revision 17 (20s, with the MV television).
 * Black + white app; the selected CD lends its own colour as the accent.
 * One draw(ctx, t) function, canvas space fixed at 1080 x 1920 (portrait phone).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RBPreview = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ---------- canvas + type ----------
    const W = 1080;
    const H = 1920;
    const DURATION = 20;
    const TAU = Math.PI * 2;
    const DEG = Math.PI / 180;
    // "RB Slab" / "RB Slab Light" are aliases set up by the page: both resolve to the locally installed
    // ITC Lubalin Graph Std Book when it is present, and to the embedded Rokkitt cuts otherwise.
    const FONT_SLAB_HEAVY = '"RB Slab", Rockwell, "Roboto Slab"';
    const FONT_SLAB_LIGHT = '"RB Slab Light", Rockwell, "Roboto Slab"';
    const FONT_CJK = '"RB CJK", "Noto Sans HK", "PingFang HK", "PingFang TC", "Microsoft JhengHei", sans-serif';
    const LIGHT_MAX_WEIGHT = 400; // weights up to this use the light cut
    const WEIGHT_HEAVY = 800;
    const WEIGHT_LIGHT = 300;
    const WHITE = [255, 255, 255];
    const BLACK = [10, 10, 12];
    const APP_VERSION = 'v0.1.0';
    const ACCENT_LIFT_ON_BLACK = 0.4;

    // ---------- timeline (seconds) ----------
    const T = {
        fadeIn: 0.3,
        loadStart: 0.25,
        loadEnd: 1.85,
        flagFade0: 2.05,
        flagFade1: 2.8,
        discIn0: 2.3,
        discIn1: 3.5,
        titleIn: 2.75,
        wheelOpen0: 4.7,
        wheelOpen1: 5.2,
        wheelClose0: 8.27,
        wheelClose1: 8.65,
        list0: 8.32,
        list1: 9.05,
        favouriteOn: 4.07,
        selectFlash: 11.37,
        listUiOut0: 11.5, // the highlight group clears first…
        listUiOut1: 11.75,
        listOut0: 11.75, // …then the disc starts to shrink back
        listOut1: 12.4,
        armLift0: 12.3,
        armSwing0: 12.42,
        armSwing1: 13.07,
        armDrop1: 13.22,
        play0: 13.18,
        mvTap: 15.0, // MV button pressed
        tvIn0: 15.05,
        tvIn1: 15.85,
        crtOn0: 15.85,
        crtOn1: 16.3,
        mvPause: 17.9, // TV buttons: pause…
        mvResume: 18.6, // …play again…
        crtOff0: 19.3, // …and stop, which switches the set off
        crtOff1: 19.58,
        fadeOut0: 19.8,
    };
    // album position on the wheel over time: [time, index, easing]
    const ALBUM_KEYS = [[0, 10], [5.45, 10], [6.05, 9, 'io'], [6.25, 9], [6.8, 8, 'io'], [7.2, 8], [8.0, 10, 'back']];
    // highlighted track over time
    const TRACK_KEYS = [[0, 0], [9.15, 0], [9.9, 5, 'out'], [10.15, 5], [11.0, 11, 'out']];

    // ---------- layout ----------
    const MARGIN = 72;
    const HOME = { x: 880, y: 1190, r: 740 }; // disc on the home screen (fills the bottom-right)
    const FOCUS = { x: 850, y: 1110, r: 620 }; // disc while the wheel is open
    const ORBIT_R = 1000; // discs travel on this arc while the wheel turns
    const ORBIT_A0 = -48 * DEG;
    const ORBIT_STEP = 30 * DEG; // spacing between neighbouring discs
    const NEIGHBOUR_SCALE = 0.72;
    const NEIGHBOUR_VEIL = 0.42;
    const ORBIT_PIVOT = { x: FOCUS.x - ORBIT_R * Math.cos(ORBIT_A0), y: FOCUS.y - ORBIT_R * Math.sin(ORBIT_A0) };
    const LIST = { x: 940, y: 1090, r: 1080 }; // disc zoomed in behind the song list
    const LIST_ARC_R = 520; // song rows sit on this arc around the disc centre
    const LIST_STEP = 9.2 * DEG;
    const LIST_VISIBLE = 4.3; // rows fade out beyond this many steps from the centre
    const LIST_FONT = { focus: 42, rest: 32 };
    const LIST_FRAME_H = 88;
    const LIST_DIM = 0.8;
    // album dial: a dome rising from the bottom edge, two-thirds of the screen wide and 150 tall
    const WHEEL = { x: 540, y: 2277, rOut: 507, band: 36, rText: 437, drop: 136 };
    const WHEEL_STEP = 13.8 * DEG;
    const WHEEL_MINOR = 4; // tick marks per album step
    const WHEEL_FONT = { focus: 58, rest: 36 };
    const WHEEL_FACE = 'rgba(241,242,244,0.95)';
    // disc anatomy, as fractions of its radius
    const RIM = 0.972; // silver edge starts here
    const HUB = 0.16; // clear plastic centre
    const CLAMP = 0.118; // solid black clamp in the middle; doubles as the play button
    const ART = 1024; // disc texture size
    const IDLE_SPIN = 0.05; // rad/s
    const PLAY_SPIN = 2.7; // rad/s
    // top-left info block: laid out at full size in its own space, then scaled as one group
    const INFO = { top: 92, scale: 2 / 3, titleSize: 176, titleMaxW: 1110, titleY: 150, yearY: 226, songY: 336 };
    // tonearm
    // parked it lies clear of the disc, pointing left under the title; to play it swings one way, down onto the disc
    const ARM = { x: 900, y: 330, length: 640, park: 176 * DEG, play: 99 * DEG, base: 96, headBend: -0.36, bendBack: 170, bendRun: 84 };
    // home-only round buttons, bottom-left: info, then favourite
    const BUTTONS = { y: 1792, r: 44, infoX: 124, favouriteX: 262, mvX: 400, ringGap: 9, ringWidth: 3.5 };
    // MV television: without its antenna it covers the lower half of the screen
    const TV = {
        x: 36, y: 962, w: 1008, h: 900, legs: 58, corner: 50, legLean: 0.2, legSlices: 14,
        front: { x: 26, y: 26, w: 956, h: 680 }, // dark recessed front
        mask: { x: 44, y: 44, w: 746, h: 644 }, // warm-white surround that slopes in to the glass
        glass: { x: 88, y: 86, w: 658, h: 560, bulgeX: 7, bulgeY: 20, corner: 60 },
        panel: { x: 806, y: 44, w: 158, h: 644 },
        knobX: 885, knobY: [280, 470], knobR: 44, dialR: 64,
        buttonY: 632, buttonR: 19, buttonGap: 47, // play / pause / stop, left to right
        antenna: [[-210, -300], [200, -340]],
    };
    const BLUR_LEVELS = 4; // backdrop blur: the frame is halved this many times, then doubled back up
    const DEMO_MV_SECONDS = 12; // pretend video length, so its progress line visibly moves
    const DEMO_TRACK_SECONDS = 20; // pretend track length, so the progress ring visibly moves in a short preview
    // preload flag: a cloth mesh, hoist off-screen left, fly end off-screen right
    const FLAG = {
        w: 1760, h: 2400, x0: -240, y0: -240,
        nx: 30, ny: 40, lightW: 90, lightH: 120,
        amp: 122, focal: 1500,
        logoW: 640, logoX: 838, logoY: 1130,
    };
    // travelling waves across the cloth: cycles along the flag (ku), down it (kv), speed and strength
    const WAVE = [
        { ku: 1.6, kv: 0.45, speed: 3.6, gain: 1 },
        { ku: 2.7, kv: -0.7, speed: 5.4, gain: 0.45 },
        { ku: 0.6, kv: 1.2, speed: 2.3, gain: 0.32 },
    ];
    const LIGHT = normalize3([-0.55, -0.38, 0.74]);
    const HALF = normalize3([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

    // simulated touches: tap when from == to
    const TOUCHES = [
        { t0: 4.58, t1: 4.7, from: [540, 1890], to: [540, 1890] },
        { t0: 5.45, t1: 6.05, from: [330, 1894], to: [424, 1894] },
        { t0: 6.25, t1: 6.8, from: [330, 1894], to: [424, 1894] },
        { t0: 7.2, t1: 7.5, from: [760, 1894], to: [572, 1894] },
        { t0: 8.17, t1: 8.29, from: [640, 1180], to: [640, 1180] },
        { t0: 9.15, t1: 9.45, from: [700, 1420], to: [700, 1150] },
        { t0: 10.15, t1: 10.45, from: [700, 1420], to: [700, 1120] },
        { t0: 11.25, t1: 11.37, from: [LIST.x, LIST.y], to: [LIST.x, LIST.y] },
        { t0: 3.95, t1: 4.07, from: [BUTTONS.favouriteX, BUTTONS.y], to: [BUTTONS.favouriteX, BUTTONS.y] },
        { t0: 14.88, t1: 15.0, from: [BUTTONS.mvX, BUTTONS.y], to: [BUTTONS.mvX, BUTTONS.y], beneathTv: true },
        { t0: T.mvPause - 0.12, t1: T.mvPause, from: [TV.x + TV.knobX, TV.y + TV.buttonY], to: [TV.x + TV.knobX, TV.y + TV.buttonY] },
        { t0: T.mvResume - 0.12, t1: T.mvResume, from: [TV.x + TV.knobX - TV.buttonGap, TV.y + TV.buttonY], to: [TV.x + TV.knobX - TV.buttonGap, TV.y + TV.buttonY] },
        { t0: T.crtOff0 - 0.12, t1: T.crtOff0, from: [TV.x + TV.knobX + TV.buttonGap, TV.y + TV.buttonY], to: [TV.x + TV.knobX + TV.buttonGap, TV.y + TV.buttonY] },
    ];

    // ---------- data ----------
    // pal = stand-in disc art colours (used only when a real cover is unavailable);
    // accent = the colour this album lends to the otherwise black + white interface.
    const ALBUMS = [
        { key: 'A', title: 'Apollo 18', year: 2008, pal: ['#101a3c', '#ff7a2f', '#f4ecd8'], accent: '#2b4bd6', pattern: 'rings' },
        { key: 'B', title: 'Beaming', year: 2009, pal: ['#ffd23f', '#ffffff', '#1b1b1b'], accent: '#d49b00', pattern: 'burst' },
        { key: 'C', title: 'Connected', year: 2010, pal: ['#0f8b8d', '#ff6f59', '#f7f3e3'], accent: '#0f8b8d', pattern: 'dots' },
        { key: 'D', title: 'Dedicated To…', year: 2011, pal: ['#6d1f2f', '#e8c9a0', '#f6efe4'], accent: '#a12a45', pattern: 'split' },
        { key: 'E', title: 'Easy', year: 2012, pal: ['#8ecae6', '#f2e2c4', '#16324f'], accent: '#3d8fb8', pattern: 'arcs' },
        { key: 'F', title: 'Frank', year: 2014, pal: ['#c9c9c4', '#d7263d', '#141414'], accent: '#d7263d', pattern: 'split' },
        { key: 'G', title: 'Gotta Go', year: 2016, pal: ['#1f7a4c', '#0d0d0d', '#e9f5db'], accent: '#1f9a5c', pattern: 'burst' },
        { key: 'H', title: 'Hours', year: 2018, pal: ['#2d2a6e', '#f6ae2d', '#f2f0ff'], accent: '#4a44c8', pattern: 'rings' },
        { key: 'I', title: 'i', year: 2020, pal: ['#e9e7e1', '#1a1a1a', '#111111'], accent: '#6f6f6f', pattern: 'arcs' },
        { key: 'J', title: 'JUNTOS', year: 2023, pal: ['#f26a1b', '#5b2a86', '#fff3e0'], accent: '#e8611a', pattern: 'dots' },
        { key: 'K', title: 'KOMOREBI', year: 2026, pal: ['#17402b', '#f3c64b', '#f7f5e6'], accent: '#2f8a4f', pattern: 'dapple' },
        { key: 'R', title: 'RubberBand Concert #1', year: 2009, pal: ['#141414', '#e4267b', '#ffffff'], accent: '#e4267b', pattern: 'rings' },
        { key: 'W', title: 'We Are RubberBand', year: 2015, pal: ['#c1121f', '#ffffff', '#fdf0d5'], accent: '#c1121f', pattern: 'burst' },
        { key: '電', title: '電影《逆流大叔》原聲大碟', year: 2022, pal: ['#0b4f8a', '#ffd166', '#ffffff'], accent: '#1565c0', pattern: 'arcs' },
    ];
    const TRACKS = ['下一位參賽者', '跟住去邊度', '搲撈HK', '毒蟲圖鑑', '太平門', '理想的下午', '我永遠記得', '揀睇誌', '一杯', '想寫好的功課', "G'night", '木漏日'];

    // ---------- maths ----------
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const lerp = (a, b, k) => a + (b - a) * k;
    const seg = (t, a, b) => clamp01((t - a) / (b - a));
    const easeOut = (k) => 1 - Math.pow(1 - k, 3);
    const easeIn = (k) => k * k * k;
    const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const easeOutExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k));
    const BACK = 1.4;
    const easeOutBack = (k) => 1 + (BACK + 1) * Math.pow(k - 1, 3) + BACK * Math.pow(k - 1, 2);
    const EASE = { io: easeInOut, out: easeOut, back: easeOutBack, lin: (k) => k };

    function normalize3(v) {
        const length = Math.hypot(v[0], v[1], v[2]);
        return [v[0] / length, v[1] / length, v[2] / length];
    }
    function track(keys, t) {
        if (t <= keys[0][0]) return keys[0][1];
        for (let i = 1; i < keys.length; i++) {
            const [t1, v1, ease] = keys[i];
            if (t < t1) {
                const [t0, v0] = keys[i - 1];
                return lerp(v0, v1, EASE[ease || 'lin']((t - t0) / (t1 - t0)));
            }
        }
        return keys[keys.length - 1][1];
    }
    function rng(seed) {
        let s = seed >>> 0;
        return function () {
            s = (s + 0x6d2b79f5) >>> 0;
            let v = Math.imul(s ^ (s >>> 15), 1 | s);
            v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
            return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
        };
    }
    const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const rgba = (rgb, a) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
    const mixRgb = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    function hslToRgb(h, sat, l) {
        const f = (n) => {
            const k = (n + h * 12) % 12;
            return Math.round(255 * (l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
        };
        return [f(0), f(8), f(4)];
    }
    // Same hue as the album's colour, pushed bright and saturated like a lit indicator.
    const GLOW = { saturation: 0.95, lightness: 0.56, neutral: [236, 238, 242] };
    function glowColor(rgb) {
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        const max = Math.max(r, g, b);
        const chroma = max - Math.min(r, g, b);
        if (chroma < 0.05) return GLOW.neutral;
        let h = max === r ? ((g - b) / chroma + 6) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
        h /= 6;
        return hslToRgb(h, GLOW.saturation, GLOW.lightness);
    }
    const isLatin = (text) => /^[\x20-ɏ]+$/.test(text);
    // Latin is set in the slab; Chinese falls through to the CJK face
    const slab = (weight, size) => `${weight} ${size}px ${weight <= LIGHT_MAX_WEIGHT ? FONT_SLAB_LIGHT : FONT_SLAB_HEAVY}, ${FONT_CJK}`;

    // ---------- drawing helpers ----------
    function circle(c, x, y, r) {
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
    }
    function annulus(c, x, y, rOut, rIn) {
        c.beginPath();
        c.arc(x, y, rOut, 0, TAU);
        c.arc(x, y, rIn, 0, TAU, true);
    }
    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }
    // ---------- shared material: machined, brushed aluminium, lit from the top-left ----------
    // Used by the tonearm and the round buttons so they read as parts of the same deck.
    const SILVER = ['#5d6067', '#b3b6bc', '#fdfdfe', '#d0d2d7', '#878a91', '#53565c'];
    const GUNMETAL = ['#2a2b2f', '#63656b', '#b0b3b9', '#77797f', '#404146', '#232427'];
    // a curved bar cannot take one straight gradient, so the tube is built from stacked strokes:
    // [width, colour, sideways offset] from the dark outline in to the highlight
    const TUBE_LAYERS = [[18, '#5d6067', 0], [15.5, '#8c8f96', -0.4], [12, '#c3c6cb', -1.2], [7.5, '#eceef0', -2.2], [2.6, '#ffffff', -3.4]];
    const CYLINDER_STOPS = [0, 0.16, 0.4, 0.6, 0.86, 1];
    const BRUSHED = ['#f5f6f7', '#8f9299', '#e6e7ea', '#7c7f86', '#f1f2f4', '#9a9da4', '#ececef', '#80838a', '#f5f6f7', '#8f9299', '#e3e4e7', '#888b92', '#f5f6f7'];
    // shading of a round bar: gradient runs from (x0, y0) to (x1, y1), across the bar
    function cylinder(c, x0, y0, x1, y1, tones) {
        const g = c.createLinearGradient(x0, y0, x1, y1);
        CYLINDER_STOPS.forEach((stop, i) => g.addColorStop(stop, tones[i]));
        return g;
    }
    // chamfered rim: outer slope catches the light at the top-left, inner slope at the bottom-right
    function bevelRing(c, x, y, rOut, rIn) {
        const mid = (rOut + rIn) / 2;
        const span = rOut * 0.72;
        const outer = c.createLinearGradient(x - span, y - span, x + span, y + span);
        outer.addColorStop(0, '#ffffff');
        outer.addColorStop(0.45, '#c3c6cb');
        outer.addColorStop(1, '#6c6f76');
        annulus(c, x, y, rOut, mid);
        c.fillStyle = outer;
        c.fill();
        const inner = c.createLinearGradient(x - span, y - span, x + span, y + span);
        inner.addColorStop(0, '#74777e');
        inner.addColorStop(0.55, '#c9ccd1');
        inner.addColorStop(1, '#ffffff');
        annulus(c, x, y, mid, rIn);
        c.fillStyle = inner;
        c.fill();
        c.lineWidth = 1;
        c.strokeStyle = 'rgba(0,0,0,0.22)';
        circle(c, x, y, rOut - 0.5);
        c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.3)';
        circle(c, x, y, rIn);
        c.stroke();
    }
    // lathe-turned top: brushed sweep, a soft dome highlight, darker towards the edge
    function brushedFace(c, x, y, r) {
        const face = c.createConicGradient(0.6, x, y);
        BRUSHED.forEach((color, i) => face.addColorStop(i / (BRUSHED.length - 1), color));
        circle(c, x, y, r);
        c.fillStyle = face;
        c.fill();
        const dome = c.createRadialGradient(x - r * 0.25, y - r * 0.3, 0, x, y, r);
        dome.addColorStop(0, 'rgba(255,255,255,0.6)');
        dome.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = dome;
        c.fill();
        const edge = c.createRadialGradient(x, y, r * 0.7, x, y, r);
        edge.addColorStop(0, 'rgba(0,0,0,0)');
        edge.addColorStop(1, 'rgba(0,0,0,0.2)');
        c.fillStyle = edge;
        c.fill();
    }
    // raised round part: cast shadow, chamfered rim, brushed top
    function metalKnob(c, x, y, r, bevel) {
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.36)';
        c.shadowBlur = r * 0.42;
        c.shadowOffsetX = r * 0.08;
        c.shadowOffsetY = r * 0.2;
        circle(c, x, y, r);
        c.fillStyle = '#b9bcc2';
        c.fill();
        c.restore();
        bevelRing(c, x, y, r, r - bevel);
        brushedFace(c, x, y, r - bevel);
    }
    // small recessed screw head
    function screw(c, x, y, r) {
        const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        g.addColorStop(0, '#8f9299');
        g.addColorStop(1, '#3b3d42');
        circle(c, x, y, r);
        c.fillStyle = g;
        c.fill();
        c.lineWidth = 1;
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.beginPath();
        c.arc(x, y, r + 0.5, 0.2, 1.9);
        c.stroke();
    }
    function trackedText(c, text, x, y, tracking, align) {
        // letter-spaced text without relying on ctx.letterSpacing
        const widths = Array.from(text).map((ch) => c.measureText(ch).width + tracking);
        const total = widths.reduce((sum, w) => sum + w, 0) - tracking;
        let cx = align === 'right' ? x - total : x;
        const prev = c.textAlign;
        c.textAlign = 'left';
        Array.from(text).forEach((ch, i) => {
            c.fillText(ch, cx, y);
            cx += widths[i];
        });
        c.textAlign = prev;
        return total;
    }
    function playIcon(c, x, y, size) {
        c.beginPath();
        c.moveTo(x - size * 0.36, y - size * 0.5);
        c.lineTo(x + size * 0.56, y);
        c.lineTo(x - size * 0.36, y + size * 0.5);
        c.closePath();
        c.fill();
    }
    // Solid black clamp at the centre of a disc: grooves, three ball catches, a spindle cap.
    function drawClamp(c, x, y, r) {
        const g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
        g.addColorStop(0, '#34353a');
        g.addColorStop(0.55, '#17171a');
        g.addColorStop(1, '#070708');
        circle(c, x, y, r);
        c.fillStyle = g;
        c.fill();
        c.lineWidth = Math.max(1, r * 0.022);
        [0.9, 0.66].forEach((k, i) => {
            c.strokeStyle = `rgba(255,255,255,${i ? 0.1 : 0.16})`;
            circle(c, x, y, r * k);
            c.stroke();
        });
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * TAU + 0.5;
            const bx = x + Math.cos(a) * r * 0.42;
            const by = y + Math.sin(a) * r * 0.42;
            const ball = c.createRadialGradient(bx - r * 0.02, by - r * 0.03, 0, bx, by, r * 0.08);
            ball.addColorStop(0, '#f2f3f5');
            ball.addColorStop(1, '#5d5f65');
            circle(c, bx, by, r * 0.075);
            c.fillStyle = ball;
            c.fill();
        }
        circle(c, x, y, r * 0.13);
        c.fillStyle = '#a9acb2';
        c.fill();
    }

    // ---------- stand-in disc art (abstract, no lettering) — only shown when a real cover is unavailable ----------
    const PATTERNS = {
        rings(c, r, pal, rnd) {
            let radius = r;
            let flip = false;
            while (radius > r * 0.12) {
                const band = r * (0.035 + rnd() * 0.11);
                c.fillStyle = flip ? pal[1] : pal[0];
                c.globalAlpha = flip ? 0.9 : 1;
                circle(c, r * 0.16, -r * 0.1, radius);
                c.fill();
                radius -= band;
                flip = !flip;
            }
            c.globalAlpha = 1;
        },
        burst(c, r, pal, rnd) {
            const wedges = 22;
            c.fillStyle = pal[1];
            for (let i = 0; i < wedges; i += 2) {
                const a0 = (i / wedges) * TAU + rnd() * 0.05;
                c.beginPath();
                c.moveTo(r * 0.3, r * 0.25);
                c.arc(r * 0.3, r * 0.25, r * 2.2, a0, a0 + TAU / wedges);
                c.closePath();
                c.fill();
            }
        },
        dots(c, r, pal, rnd) {
            const step = r * 0.19;
            for (let y = -r; y <= r; y += step) {
                for (let x = -r; x <= r; x += step) {
                    const size = step * (0.16 + 0.3 * rnd());
                    c.fillStyle = rnd() > 0.78 ? pal[2] : pal[1];
                    circle(c, x + ((Math.round(y / step) & 1) * step) / 2, y, size);
                    c.fill();
                }
            }
        },
        split(c, r, pal) {
            c.save();
            c.rotate(-0.5);
            c.fillStyle = pal[1];
            c.fillRect(-r * 1.5, r * 0.08, r * 3, r * 2);
            c.fillStyle = pal[0];
            for (let i = 0; i < 6; i++) c.fillRect(-r * 1.5, r * (0.2 + i * 0.16), r * 3, r * 0.045);
            c.restore();
        },
        arcs(c, r, pal, rnd) {
            c.lineCap = 'round';
            for (let i = 0; i < 9; i++) {
                c.strokeStyle = i % 3 === 2 ? pal[2] : pal[1];
                c.globalAlpha = 0.85;
                c.lineWidth = r * (0.03 + rnd() * 0.07);
                const a0 = rnd() * TAU;
                c.beginPath();
                c.arc(r * 0.2, r * 0.15, r * (0.3 + i * 0.13), a0, a0 + 1.2 + rnd() * 2.6);
                c.stroke();
            }
            c.globalAlpha = 1;
        },
        dapple(c, r, pal, rnd) {
            const second = hexToRgb(pal[1]);
            const leaf = hexToRgb('#7fc46a');
            const shade = hexToRgb('#0b2417');
            for (let i = 0; i < 150; i++) {
                const angle = rnd() * TAU;
                const dist = Math.sqrt(rnd()) * r;
                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist;
                const size = r * (0.04 + rnd() * rnd() * 0.3);
                const pick = rnd();
                const rgb = pick < 0.42 ? second : pick < 0.72 ? leaf : shade;
                const g = c.createRadialGradient(x, y, 0, x, y, size);
                g.addColorStop(0, rgba(rgb, pick < 0.72 ? 0.85 : 0.7));
                g.addColorStop(0.55, rgba(rgb, 0.4));
                g.addColorStop(1, rgba(rgb, 0));
                c.fillStyle = g;
                circle(c, x, y, size);
                c.fill();
            }
        },
    };

    // Cuts the clear hub out of a printed disc and seats the black clamp in it.
    function finishDisc(c) {
        const r = ART / 2;
        c.save();
        c.globalCompositeOperation = 'destination-out';
        circle(c, r, r, r * HUB);
        c.fill();
        c.globalCompositeOperation = 'source-over';
        annulus(c, r, r, r * HUB, r * CLAMP);
        c.fillStyle = 'rgba(150,154,162,0.32)';
        c.fill();
        c.lineWidth = 2.5;
        c.strokeStyle = 'rgba(255,255,255,0.75)';
        circle(c, r, r, r * HUB - 1.5);
        c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.3)';
        circle(c, r, r, r * (HUB - 0.014));
        c.stroke();
        drawClamp(c, r, r, r * CLAMP);
        c.restore();
    }

    function makePlaceholderArt(mk, album, index) {
        const cv = mk(ART, ART);
        const c = cv.getContext('2d');
        const r = ART / 2;
        c.save();
        c.translate(r, r);
        circle(c, 0, 0, r);
        c.clip();
        c.fillStyle = album.pal[0];
        c.fillRect(-r, -r, ART, ART);
        PATTERNS[album.pattern](c, r, album.pal, rng(index * 7919 + 17));
        c.restore();
        finishDisc(c);
        return cv;
    }

    function makeCoverArt(mk, image) {
        const cv = mk(ART, ART);
        const c = cv.getContext('2d');
        c.save();
        circle(c, ART / 2, ART / 2, ART / 2);
        c.clip();
        c.drawImage(image, 0, 0, ART, ART);
        c.restore();
        finishDisc(c);
        return cv;
    }

    // ---------- preload flag (cloth mesh) ----------
    function makeFlag(mk, logo) {
        const cols = FLAG.nx + 1;
        const rows = FLAG.ny + 1;
        const flat = mk(FLAG.w, FLAG.h);
        const light = mk(FLAG.lightW, FLAG.lightH);
        const layer = mk(W, H);
        const lightCtx = light.getContext('2d');
        return {
            logo,
            flat,
            flatCtx: flat.getContext('2d'),
            light,
            lightCtx,
            lightPixels: lightCtx.createImageData(FLAG.lightW, FLAG.lightH),
            layer, // the flag is drawn here first so it can fade as one piece
            layerCtx: layer.getContext('2d'),
            sx: new Float32Array(cols * rows),
            sy: new Float32Array(cols * rows),
            sample: { z: 0, zx: 0, zy: 0, lift: 0 },
        };
    }

    // Height field of the cloth: travelling waves, pinned at the hoist and free at the fly end.
    function flagWave(u, v, phase, gust, out) {
        const a1 = TAU * (WAVE[0].ku * u + WAVE[0].kv * v) - phase * WAVE[0].speed;
        const a2 = TAU * (WAVE[1].ku * u + WAVE[1].kv * v) - phase * WAVE[1].speed + 1.7;
        const a3 = TAU * (WAVE[2].ku * u + WAVE[2].kv * v) - phase * WAVE[2].speed + 0.4;
        const uu = Math.max(u, 0.002);
        const env = 0.14 + 0.86 * Math.pow(uu, 0.85);
        const envSlope = 0.731 * Math.pow(uu, -0.15);
        const s = WAVE[0].gain * Math.sin(a1) + WAVE[1].gain * Math.sin(a2) + WAVE[2].gain * Math.sin(a3);
        const amp = FLAG.amp * gust;
        out.z = amp * env * s;
        out.zx = (amp * (envSlope * s + env * TAU * (WAVE[0].gain * WAVE[0].ku * Math.cos(a1) + WAVE[1].gain * WAVE[1].ku * Math.cos(a2) + WAVE[2].gain * WAVE[2].ku * Math.cos(a3)))) / FLAG.w;
        out.zy = (amp * env * TAU * (WAVE[0].gain * WAVE[0].kv * Math.cos(a1) + WAVE[1].gain * WAVE[1].kv * Math.cos(a2) + WAVE[2].gain * WAVE[2].kv * Math.cos(a3))) / FLAG.h;
        out.lift = amp * 0.38 * env * Math.sin(a3 + 0.9);
        return out;
    }

    function shadeFlag(flag, phase, gust) {
        const data = flag.lightPixels.data;
        const sample = flag.sample;
        let p = 0;
        for (let j = 0; j < FLAG.lightH; j++) {
            for (let i = 0; i < FLAG.lightW; i++) {
                flagWave(i / (FLAG.lightW - 1), j / (FLAG.lightH - 1), phase, gust, sample);
                const inv = 1 / Math.hypot(sample.zx, sample.zy, 1);
                const nx = -sample.zx * inv;
                const ny = -sample.zy * inv;
                const diffuse = nx * LIGHT[0] + ny * LIGHT[1] + inv * LIGHT[2] - LIGHT[2];
                const spec = Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + inv * HALF[2]), 60);
                const lit = diffuse * 0.75 + spec * 0.1 - 0.035;
                if (lit > 0) {
                    data[p] = data[p + 1] = data[p + 2] = 255;
                    data[p + 3] = Math.min(0.42, lit) * 255;
                } else {
                    data[p] = data[p + 1] = data[p + 2] = 0;
                    data[p + 3] = Math.min(0.72, -lit * 2.6) * 255;
                }
                p += 4;
            }
        }
        flag.lightCtx.putImageData(flag.lightPixels, 0, 0);
    }

    function composeFlag(flag) {
        const c = flag.flatCtx;
        const logoH = (FLAG.logoW * flag.logo.height) / flag.logo.width;
        c.globalAlpha = 1;
        c.fillStyle = '#000';
        c.fillRect(0, 0, FLAG.w, FLAG.h);
        c.drawImage(flag.logo, FLAG.logoX - FLAG.logoW / 2, FLAG.logoY - logoH / 2, FLAG.logoW, logoH);
        c.drawImage(flag.light, 0, 0, FLAG.w, FLAG.h);
    }

    function projectFlag(flag, phase, gust) {
        const cols = FLAG.nx + 1;
        const dx = FLAG.w / FLAG.nx;
        const sample = flag.sample;
        for (let j = 0; j <= FLAG.ny; j++) {
            const v = j / FLAG.ny;
            let run = 0; // arc length is preserved, so steep folds read as compressed cloth
            for (let i = 0; i <= FLAG.nx; i++) {
                flagWave(i / FLAG.nx, v, phase, gust, sample);
                if (i > 0) run += dx * Math.sqrt(1 - Math.min(0.75, sample.zx * sample.zx));
                const depth = FLAG.focal / (FLAG.focal - sample.z);
                const index = j * cols + i;
                flag.sx[index] = W / 2 + (FLAG.x0 + run - W / 2) * depth;
                flag.sy[index] = H / 2 + (FLAG.y0 + v * FLAG.h + sample.lift - H / 2) * depth;
            }
        }
    }

    // Affine-maps one triangle of the flat flag texture onto the screen.
    const TRI_BLEED = 0.9; // px of overlap so neighbouring triangles leave no seams
    const TRI_PAD = 4;
    function texturedTriangle(ctx, image, s, d) {
        const [s0x, s0y, s1x, s1y, s2x, s2y] = s;
        let [d0x, d0y, d1x, d1y, d2x, d2y] = d;
        const den = s0x * (s1y - s2y) + s1x * (s2y - s0y) + s2x * (s0y - s1y);
        const a = (d0x * (s1y - s2y) + d1x * (s2y - s0y) + d2x * (s0y - s1y)) / den;
        const c = (d0x * (s2x - s1x) + d1x * (s0x - s2x) + d2x * (s1x - s0x)) / den;
        const e = (d0x * (s1x * s2y - s2x * s1y) + d1x * (s2x * s0y - s0x * s2y) + d2x * (s0x * s1y - s1x * s0y)) / den;
        const b = (d0y * (s1y - s2y) + d1y * (s2y - s0y) + d2y * (s0y - s1y)) / den;
        const dd = (d0y * (s2x - s1x) + d1y * (s0x - s2x) + d2y * (s1x - s0x)) / den;
        const f = (d0y * (s1x * s2y - s2x * s1y) + d1y * (s2x * s0y - s0x * s2y) + d2y * (s0x * s1y - s1x * s0y)) / den;
        const gx = (d0x + d1x + d2x) / 3;
        const gy = (d0y + d1y + d2y) / 3;
        const grow = (px, py) => {
            const length = Math.hypot(px - gx, py - gy) || 1;
            return [px + ((px - gx) / length) * TRI_BLEED, py + ((py - gy) / length) * TRI_BLEED];
        };
        [d0x, d0y] = grow(d0x, d0y);
        [d1x, d1y] = grow(d1x, d1y);
        [d2x, d2y] = grow(d2x, d2y);
        // sample a little beyond the triangle so the bleed has texture under it
        const minX = Math.max(0, Math.min(s0x, s1x, s2x) - TRI_PAD);
        const minY = Math.max(0, Math.min(s0y, s1y, s2y) - TRI_PAD);
        const w = Math.min(image.width, Math.max(s0x, s1x, s2x) + TRI_PAD) - minX;
        const h = Math.min(image.height, Math.max(s0y, s1y, s2y) + TRI_PAD) - minY;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(d0x, d0y);
        ctx.lineTo(d1x, d1y);
        ctx.lineTo(d2x, d2y);
        ctx.closePath();
        ctx.clip();
        ctx.transform(a, b, c, dd, e, f);
        ctx.drawImage(image, minX, minY, w, h, minX, minY, w, h);
        ctx.restore();
    }

    function drawFlagMesh(ctx, flag) {
        const cols = FLAG.nx + 1;
        const cellW = FLAG.w / FLAG.nx;
        const cellH = FLAG.h / FLAG.ny;
        const { sx, sy, flat } = flag;
        for (let j = 0; j < FLAG.ny; j++) {
            for (let i = 0; i < FLAG.nx; i++) {
                const p00 = j * cols + i;
                const p10 = p00 + 1;
                const p01 = p00 + cols;
                const p11 = p01 + 1;
                if (Math.max(sx[p00], sx[p10], sx[p01], sx[p11]) < 0 || Math.min(sx[p00], sx[p10], sx[p01], sx[p11]) > W) continue;
                if (Math.max(sy[p00], sy[p10], sy[p01], sy[p11]) < 0 || Math.min(sy[p00], sy[p10], sy[p01], sy[p11]) > H) continue;
                const x0 = i * cellW;
                const y0 = j * cellH;
                const x1 = x0 + cellW;
                const y1 = y0 + cellH;
                texturedTriangle(ctx, flat, [x0, y0, x1, y0, x0, y1], [sx[p00], sy[p00], sx[p10], sy[p10], sx[p01], sy[p01]]);
                texturedTriangle(ctx, flat, [x1, y0, x1, y1, x0, y1], [sx[p10], sy[p10], sx[p11], sy[p11], sx[p01], sy[p01]]);
            }
        }
    }

    // ---------- scene ----------
    function create(env) {
        const mk = env.createCanvas;
        const art = ALBUMS.map((album, i) => makePlaceholderArt(mk, album, i));
        const presetAccents = ALBUMS.map((album) => hexToRgb(album.accent));
        const accents = presetAccents.slice();
        const flag = makeFlag(mk, env.logo);
        const scratch = mk(W, H);
        const scratchCtx = scratch.getContext('2d');
        const blurLayers = Array.from({ length: BLUR_LEVELS }, (unused, level) => mk(W >> (level + 1), H >> (level + 1)));
        let titleFit = {};

        function fitTitle(ctx, title) {
            if (!titleFit[title]) {
                ctx.font = slab(WEIGHT_HEAVY, INFO.titleSize);
                titleFit[title] = Math.min(INFO.titleSize, (INFO.titleSize * INFO.titleMaxW) / ctx.measureText(title).width);
            }
            return titleFit[title];
        }

        function state(t) {
            const wheel = easeOut(seg(t, T.wheelOpen0, T.wheelOpen1)) * (1 - easeIn(seg(t, T.wheelClose0, T.wheelClose1)));
            const listIn = easeInOut(seg(t, T.list0, T.list1));
            const list = listIn * (1 - easeInOut(seg(t, T.listOut0, T.listOut1)));
            // true from the moment the dial opens until the disc is back home after a track is chosen
            const browsing = easeOut(seg(t, T.wheelOpen0, T.wheelOpen1)) * (1 - easeInOut(seg(t, T.listOut0, T.listOut1)));
            const p = track(ALBUM_KEYS, t);
            const lo = Math.max(0, Math.min(ALBUMS.length - 1, Math.floor(p)));
            const hi = Math.min(ALBUMS.length - 1, lo + 1);
            const accent = mixRgb(accents[lo], accents[hi], clamp01(p - lo));
            const mvPaused = easeOut(seg(t, T.mvPause, T.mvPause + 0.25)) * (1 - easeOut(seg(t, T.mvResume, T.mvResume + 0.25)));
            const sinceMv = Math.max(0, t - T.mvTap);
            return {
                t,
                p,
                s: track(TRACK_KEYS, t),
                wheel,
                list, // how far the disc is zoomed in behind the song list
                listIn,
                listUi: listIn * (1 - easeOut(seg(t, T.listUiOut0, T.listUiOut1))), // rows + highlight group
                homeUi: 1 - browsing, // tonearm and round buttons belong to the home screen only
                favourite: easeOut(seg(t, T.favouriteOn, T.favouriteOn + 0.25)),
                play: seg(t, T.play0, T.play0 + 0.5),
                running: 1 - easeOut(seg(t, T.mvTap, T.mvTap + 0.4)), // the record stops once the MV takes over
                clock: Math.max(0, Math.min(t, T.mvTap) - T.play0), // seconds of the track played so far
                spinClock: Math.max(0, Math.min(t, T.mvTap) - T.play0) + 0.22 * (1 - Math.exp(-5 * sinceMv)), // the platter coasts to a stop
                mvRunning: 1 - mvPaused,
                mvClock: Math.max(0, Math.min(t, T.mvPause) - T.crtOn0) + Math.max(0, t - T.mvResume), // seconds of the video played so far
                tvBlur: easeOut(seg(t, T.tvIn0, T.tvIn0 + 0.55)),
                crtOff: seg(t, T.crtOff0, T.crtOff1),
                mvOn: easeOut(seg(t, T.mvTap, T.mvTap + 0.25)),
                tv: seg(t, T.tvIn0, T.tvIn1),
                crt: seg(t, T.crtOn0, T.crtOn1),
                home: seg(t, T.discIn0, T.discIn1),
                accent: mixRgb(accent, WHITE, ACCENT_LIFT_ON_BLACK * list), // colour lent by the selected CD, lifted to stay readable on black
                ink: mixRgb(BLACK, WHITE, list), // type flips to white over the darkened disc
            };
        }

        // ----- background: white at home, black behind the song list -----
        function drawBackground(ctx, st, focusPose) {
            ctx.fillStyle = rgba(mixRgb(WHITE, BLACK, st.list), 1);
            ctx.fillRect(0, 0, W, H);
            const strength = easeOut(st.home) * (1 - st.list);
            if (strength <= 0) return;
            const g = ctx.createRadialGradient(focusPose.x, focusPose.y, focusPose.r * 0.6, focusPose.x, focusPose.y, focusPose.r * 1.9);
            g.addColorStop(0, rgba(st.accent, 0.14 * strength));
            g.addColorStop(1, rgba(st.accent, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        // ----- discs -----
        function discPose(i, st) {
            const distance = Math.abs(i - st.p);
            const fan = lerp(0.3, 1, st.wheel); // neighbours fan out from behind as the wheel opens
            const angle = ORBIT_A0 + (i - st.p) * fan * ORBIT_STEP;
            const ox = ORBIT_PIVOT.x + ORBIT_R * Math.cos(angle);
            const oy = ORBIT_PIVOT.y + ORBIT_R * Math.sin(angle);
            const stage = lerp(HOME.r / FOCUS.r, 1, st.wheel);
            const enter = 1 - easeOutExpo(st.home);
            let x = lerp(HOME.x, FOCUS.x, st.wheel) + (ox - FOCUS.x) * stage + enter * 980;
            let y = lerp(HOME.y, FOCUS.y, st.wheel) + (oy - FOCUS.y) * stage + enter * 260;
            let r = FOCUS.r * lerp(1, NEIGHBOUR_SCALE, clamp01(distance)) * stage;
            x = lerp(x, LIST.x, st.list);
            y = lerp(y, LIST.y, st.list);
            r = lerp(r, LIST.r, st.list);
            const focus = clamp01(1 - distance);
            const playAngle = st.spinClock;
            const rot =
                -0.2 +
                st.t * IDLE_SPIN +
                (i - st.p) * 0.6 -
                enter * 1.7 +
                st.s * LIST_STEP +
                PLAY_SPIN * (playAngle - (1 - Math.exp(-3 * playAngle)) / 3);
            return {
                x,
                y,
                r,
                rot,
                alpha: lerp(st.wheel * st.wheel * (1 - st.list), 1, easeInOut(focus)),
                veil: clamp01(distance) * NEIGHBOUR_VEIL,
            };
        }

        function drawDisc(ctx, texture, pose, st) {
            const { x, y, r } = pose;
            ctx.save();
            ctx.globalAlpha = pose.alpha;
            // body + drop shadow
            ctx.save();
            ctx.shadowColor = `rgba(0,0,0,${lerp(0.3, 0.6, st.list)})`;
            ctx.shadowBlur = r * 0.12;
            ctx.shadowOffsetX = r * 0.015;
            ctx.shadowOffsetY = r * 0.04;
            annulus(ctx, x, y, r, r * HUB);
            ctx.fillStyle = '#c9cbd0';
            ctx.fill();
            ctx.restore();
            // printed side
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(pose.rot);
            ctx.drawImage(texture, -r, -r, r * 2, r * 2);
            ctx.restore();
            // light sweeping across the surface — stays put while the disc turns
            ctx.save();
            annulus(ctx, x, y, r * RIM, r * HUB);
            ctx.clip();
            const sheen = ctx.createConicGradient(-2.25, x, y);
            [[0, 0], [0.05, 0.24], [0.1, 0.05], [0.16, 0], [0.5, 0], [0.56, 0.15], [0.62, 0], [1, 0]].forEach(([stop, a]) =>
                sheen.addColorStop(stop, `rgba(255,255,255,${a})`)
            );
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = sheen;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
            // silver edge left unprinted around the disc
            const silver = ctx.createConicGradient(-0.9, x, y);
            [[0, '#f7f8fa'], [0.12, '#a3a6ad'], [0.27, '#eceef1'], [0.42, '#8e9198'], [0.55, '#f2f3f5'], [0.7, '#9c9fa6'], [0.86, '#e3e5e9'], [1, '#f7f8fa']].forEach(([stop, color]) =>
                silver.addColorStop(stop, color)
            );
            annulus(ctx, x, y, r, r * RIM);
            ctx.fillStyle = silver;
            ctx.fill();
            ctx.lineWidth = Math.max(1, r * 0.0025);
            ctx.strokeStyle = 'rgba(0,0,0,0.32)';
            circle(ctx, x, y, r * RIM);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(0,0,0,0.22)';
            circle(ctx, x, y, r - ctx.lineWidth / 2);
            ctx.stroke();
            if (pose.veil > 0) {
                // discs waiting behind the selected one sit back, washed towards the page
                circle(ctx, x, y, r);
                ctx.fillStyle = rgba(WHITE, pose.veil);
                ctx.fill();
            }
            ctx.restore();
        }

        function drawDiscs(ctx, st) {
            // ascending order = the album further right on the wheel is always on top
            ALBUMS.forEach((album, i) => {
                if (Math.abs(i - st.p) > 3.2) return;
                const pose = discPose(i, st);
                if (pose.alpha <= 0.002) return;
                drawDisc(ctx, art[i], pose, st);
            });
        }

        // The clamp of the selected disc is the transport button:
        // play while choosing a track, pause + a progress ring once the track is playing.
        function drawHubButton(ctx, st, pose) {
            const solid = st.listUi;
            const playing = easeOut(st.play);
            if (solid <= 0 && playing <= 0) return;
            const flash = seg(st.t, T.selectFlash, T.selectFlash + 0.06) * (1 - seg(st.t, T.selectFlash + 0.12, T.selectFlash + 0.4));
            const r = pose.r * CLAMP * (1 + flash * 0.08);
            const { x, y } = pose;
            ctx.save();
            if (solid > 0) {
                ctx.globalAlpha = solid;
                drawClamp(ctx, x, y, r);
                ctx.lineWidth = 3;
                ctx.strokeStyle = rgba(mixRgb(WHITE, st.accent, flash), 1);
                circle(ctx, x, y, r);
                ctx.stroke();
                ctx.fillStyle = rgba(mixRgb(WHITE, st.accent, flash), 1);
                playIcon(ctx, x, y, r * 0.62);
            }
            if (playing > 0) {
                // progress ring: faint full track, then the elapsed part in the album's colour
                const ringR = r * 0.84;
                const progress = clamp01(st.clock / DEMO_TRACK_SECONDS);
                ctx.globalAlpha = playing;
                ctx.lineCap = 'round';
                ctx.lineWidth = Math.max(5, r * 0.1);
                ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                circle(ctx, x, y, ringR);
                ctx.stroke();
                ctx.strokeStyle = rgba(st.accent, 1);
                ctx.beginPath();
                ctx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
                ctx.stroke();
                // pause icon while it runs, play icon while it is held
                const barW = r * 0.17;
                const barH = r * 0.56 * Math.min(1, playing * 1.2);
                ctx.fillStyle = rgba(WHITE, 1);
                ctx.globalAlpha = playing * st.running;
                roundRect(ctx, x - barW * 1.45, y - barH / 2, barW, barH, barW * 0.25);
                ctx.fill();
                roundRect(ctx, x + barW * 0.45, y - barH / 2, barW, barH, barW * 0.25);
                ctx.fill();
                ctx.globalAlpha = playing * (1 - st.running);
                playIcon(ctx, x, y, r * 0.5);
            }
            ctx.restore();
        }

        // ----- tonearm: a fixture of the page. Parked clear of the disc; it only rests on the disc while playing -----
        function paintTonearm(ctx, st) {
            const back = easeInOut(seg(st.t, T.mvTap + 0.1, T.mvTap + 0.8)); // returns to its rest when the MV takes over
            const swing = easeInOut(seg(st.t, T.armSwing0, T.armSwing1)) * (1 - back);
            const lift =
                seg(st.t, T.armLift0, T.armSwing0) * (1 - seg(st.t, T.armSwing1, T.armDrop1)) +
                seg(st.t, T.mvTap, T.mvTap + 0.12) * (1 - seg(st.t, T.mvTap + 0.75, T.mvTap + 0.9));
            const wobble = st.play * st.running * Math.sin(st.t * 7) * 0.0025;
            const angle = lerp(ARM.park, ARM.play, swing) + wobble;
            const L = ARM.length;
            const B = ARM.base;
            const castShadow = (blur, dx, dy) => {
                ctx.shadowColor = 'rgba(0,0,0,0.34)';
                ctx.shadowBlur = blur + lift * 16;
                ctx.shadowOffsetX = dx + lift * 10;
                ctx.shadowOffsetY = dy + lift * 22;
            };
            const noShadow = () => {
                ctx.shadowColor = 'transparent';
            };
            const slope = (x0, y0, x1, y1, from, to) => {
                const g = ctx.createLinearGradient(x0, y0, x1, y1);
                g.addColorStop(0, from);
                g.addColorStop(1, to);
                return g;
            };
            ctx.save();
            ctx.translate(ARM.x, ARM.y);
            // base: chamfered plinth, recessed screws
            metalKnob(ctx, 0, 0, B, 13);
            for (let i = 0; i < 6; i++) screw(ctx, Math.cos((i / 6) * TAU + 0.26) * (B - 30), Math.sin((i / 6) * TAU + 0.26) * (B - 30), 5.5);
            // everything below turns with the arm; local +y runs from the pivot to the stylus
            ctx.rotate(angle - Math.PI / 2);
            ctx.scale(1 + lift * 0.02, 1 + lift * 0.02);
            // counterweight: a turned cylinder with grooves and a knurled grip
            castShadow(20, 9, 18);
            roundRect(ctx, -41, -172, 82, 108, 12);
            ctx.fillStyle = cylinder(ctx, -41, 0, 41, 0, SILVER);
            ctx.fill();
            noShadow();
            ctx.save();
            roundRect(ctx, -41, -172, 82, 108, 12);
            ctx.clip();
            for (let x = -38; x <= 38; x += 5) {
                ctx.fillStyle = 'rgba(0,0,0,0.16)';
                ctx.fillRect(x, -150, 1.5, 30);
            }
            [-152, -118, -84].forEach((y) => {
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.fillRect(-41, y, 82, 2);
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.fillRect(-41, y + 2, 82, 1.5);
            });
            ctx.restore();
            // rear stub
            castShadow(16, 8, 16);
            ctx.fillStyle = cylinder(ctx, -11, 0, 11, 0, SILVER);
            ctx.fillRect(-11, -66, 22, 44);
            // arm tube: one continuous bar that curves into the headshell (no joint at the bend)
            const bendY = L - ARM.bendBack;
            const headX = -Math.sin(ARM.headBend); // direction of the headshell, in the arm's own space
            const headY = Math.cos(ARM.headBend);
            const tube = (dx) => {
                ctx.beginPath();
                ctx.moveTo(dx, 26);
                ctx.lineTo(dx, bendY - ARM.bendRun);
                ctx.quadraticCurveTo(dx, bendY, headX * ARM.bendRun + dx, bendY + headY * ARM.bendRun);
            };
            ctx.lineCap = 'round';
            TUBE_LAYERS.forEach(([width, color, dx], index) => {
                if (index === 1) noShadow();
                tube(dx);
                ctx.lineWidth = width;
                ctx.strokeStyle = color;
                ctx.stroke();
            });
            // cable cuff
            castShadow(8, 3, 6);
            roundRect(ctx, -13, L * 0.42, 26, 22, 5);
            ctx.fillStyle = cylinder(ctx, -13, 0, 13, 0, GUNMETAL);
            ctx.fill();
            noShadow();
            // pivot turret
            metalKnob(ctx, 0, 0, 38, 8);
            screw(ctx, 0, 0, 9);
            // headshell: finger lift, cartridge, then the plate the tube runs into
            ctx.translate(0, bendY);
            ctx.rotate(ARM.headBend);
            ctx.translate(0, ARM.bendRun - 26);
            castShadow(14, 7, 12);
            ctx.save();
            ctx.translate(16, 54);
            ctx.rotate(-0.42);
            roundRect(ctx, 0, -4.5, 50, 9, 4.5);
            ctx.fillStyle = cylinder(ctx, 0, -4.5, 0, 4.5, SILVER);
            ctx.fill();
            ctx.restore();
            roundRect(ctx, -19, 62, 38, 62, 6);
            ctx.fillStyle = cylinder(ctx, -19, 0, 19, 0, GUNMETAL);
            ctx.fill();
            roundRect(ctx, -24, 24, 48, 58, 8);
            ctx.fillStyle = slope(-24, 24, 24, 82, '#ffffff', '#9a9da4');
            ctx.fill();
            noShadow();
            ctx.lineWidth = 2;
            ctx.strokeStyle = slope(-24, 24, 24, 82, 'rgba(255,255,255,0.95)', 'rgba(0,0,0,0.35)');
            roundRect(ctx, -23, 25, 46, 56, 7);
            ctx.stroke();
            screw(ctx, -11, 40, 4);
            screw(ctx, 11, 40, 4);
            // stylus lights up in the album's colour while it plays
            circle(ctx, 0, 108, 6);
            ctx.fillStyle = rgba(mixRgb([150, 152, 158], glowColor(st.accent), st.play * st.running), 1);
            ctx.fill();
            ctx.restore();
        }

        function knobIcon(ctx, icon, x, y, size) {
            if (icon === 'mv') {
                // a little screen with a play mark
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = size * 0.26;
                roundRect(ctx, x - size * 1.05, y - size * 0.78, size * 2.1, size * 1.56, size * 0.32);
                ctx.stroke();
                playIcon(ctx, x, y, size * 0.72);
                return;
            }
            if (icon === 'favourite') {
                ctx.beginPath();
                ctx.moveTo(x, y + size * 0.78);
                ctx.bezierCurveTo(x - size * 1.5, y - size * 0.12, x - size * 0.62, y - size * 1.12, x, y - size * 0.34);
                ctx.bezierCurveTo(x + size * 0.62, y - size * 1.12, x + size * 1.5, y - size * 0.12, x, y + size * 0.78);
                ctx.fill();
                return;
            }
            circle(ctx, x, y - size * 0.72, size * 0.2);
            ctx.fill();
            roundRect(ctx, x - size * 0.17, y - size * 0.3, size * 0.34, size * 1.1, size * 0.12);
            ctx.fill();
        }

        // Push button: brushed metal face with a slim graphite chamfer, and a thin light ring
        // around it that glows in the album's hue when the button is switched on.
        function drawKnob(ctx, x, y, r, lit, accent, icon) {
            const glow = glowColor(accent);
            const ringR = r + BUTTONS.ringGap;
            ctx.save();
            ctx.lineWidth = BUTTONS.ringWidth;
            ctx.strokeStyle = rgba(mixRgb([200, 202, 207], glow, lit), 1);
            ctx.shadowColor = rgba(glow, 0.95 * lit);
            ctx.shadowBlur = 20 * lit;
            circle(ctx, x, y, ringR);
            ctx.stroke();
            if (lit > 0) {
                ctx.stroke(); // second pass thickens the halo
                ctx.shadowColor = 'transparent';
                ctx.globalAlpha = lit;
                ctx.lineWidth = BUTTONS.ringWidth * 0.35;
                ctx.strokeStyle = rgba(mixRgb(glow, WHITE, 0.65), 1);
                ctx.stroke(); // bright core of the ring
                ctx.globalAlpha = 1;
            }
            // button body: cast shadow, slim chamfer, brushed face
            ctx.shadowColor = 'rgba(0,0,0,0.36)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 9;
            circle(ctx, x, y, r + 3);
            const chamfer = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
            chamfer.addColorStop(0, '#a4a7ad');
            chamfer.addColorStop(1, '#3d3f44');
            ctx.fillStyle = chamfer;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            brushedFace(ctx, x, y, r);
            // engraved icon: a light lower lip, then the cut itself
            const size = r * 0.46;
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            knobIcon(ctx, icon, x, y + 1.5, size);
            ctx.fillStyle = rgba(mixRgb([50, 52, 58], glow, lit), 1); // the icon takes the same colour as the lit ring
            knobIcon(ctx, icon, x, y, size);
            ctx.restore();
        }

        function paintButtons(ctx, st) {
            const press = seg(st.t, T.favouriteOn - 0.12, T.favouriteOn) * (1 - seg(st.t, T.favouriteOn, T.favouriteOn + 0.15));
            drawKnob(ctx, BUTTONS.infoX, BUTTONS.y, BUTTONS.r, 0, st.accent, 'info');
            drawKnob(ctx, BUTTONS.favouriteX, BUTTONS.y, BUTTONS.r * (1 - press * 0.07), st.favourite, st.accent, 'favourite');
            const mvPress = seg(st.t, T.mvTap - 0.12, T.mvTap) * (1 - seg(st.t, T.mvTap, T.mvTap + 0.15));
            drawKnob(ctx, BUTTONS.mvX, BUTTONS.y, BUTTONS.r * (1 - mvPress * 0.07), st.mvOn, st.accent, 'mv');
        }

        // Tonearm and round buttons live on the home screen only: they step aside from the moment
        // the dial opens until the chosen track brings the disc back home.
        function drawHomeFixtures(ctx, st) {
            const alpha = st.homeUi;
            if (alpha <= 0.002) return;
            if (alpha >= 0.998) {
                paintButtons(ctx, st);
                paintTonearm(ctx, st);
                return;
            }
            // fade as one piece, so overlapping parts do not show through each other
            scratchCtx.clearRect(0, 0, W, H);
            paintButtons(scratchCtx, st);
            paintTonearm(scratchCtx, st);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.drawImage(scratch, 0, 0);
            ctx.restore();
        }

        // ----- top-left info block -----
        function enterInfoGroup(ctx) {
            ctx.translate(MARGIN, INFO.top);
            ctx.scale(INFO.scale, INFO.scale);
        }

        function drawVersion(ctx, st) {
            const a = easeOut(seg(st.t, T.titleIn - 0.1, T.titleIn + 0.5)) * 0.5;
            if (a <= 0) return;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = rgba(st.ink, 1);
            ctx.textBaseline = 'alphabetic';
            ctx.font = slab(WEIGHT_LIGHT, 26);
            trackedText(ctx, APP_VERSION, W - MARGIN, 104, 2, 'right');
            ctx.restore();
        }

        function drawAlbumTitle(ctx, st, i) {
            const offset = i - st.p;
            const visible = clamp01(1 - Math.abs(offset) * 2.4);
            if (visible <= 0) return;
            const album = ALBUMS[i];
            const size = fitTitle(ctx, album.title);
            const shift = offset * 120;
            ctx.save();
            enterInfoGroup(ctx);
            ctx.fillStyle = rgba(st.ink, 1);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.font = slab(WEIGHT_HEAVY, size);
            const chars = Array.from(album.title);
            chars.forEach((ch, j) => {
                const rise = easeOut(seg(st.t, T.titleIn + j * 0.045, T.titleIn + 0.5 + j * 0.045));
                if (rise <= 0) return;
                const x = ctx.measureText(chars.slice(0, j).join('')).width;
                ctx.save();
                ctx.beginPath();
                ctx.rect(x - 20, INFO.titleY + shift - size, size * 1.4, size * 1.3);
                ctx.clip();
                ctx.globalAlpha = visible;
                ctx.fillText(ch, x, INFO.titleY + shift + (1 - rise) * size);
                ctx.restore();
            });
            // year + hairline
            const yearIn = easeOut(seg(st.t, T.titleIn + 0.35, T.titleIn + 0.9));
            ctx.globalAlpha = visible * yearIn * 0.8;
            ctx.font = slab(WEIGHT_LIGHT, 54);
            const yearW = trackedText(ctx, String(album.year), 4, INFO.yearY + shift * 0.6 + (1 - yearIn) * 18, 8, 'left');
            ctx.fillStyle = rgba(st.accent, 1);
            ctx.fillRect(yearW + 34, INFO.yearY + shift * 0.6 - 19, 150 * yearIn, 5);
            ctx.restore();
        }

        function drawSongLine(ctx, st) {
            const chosen = seg(st.t, T.listOut0, T.listOut0 + 0.2);
            const show = Math.max(st.list, chosen);
            if (show <= 0) return;
            const index = Math.max(0, Math.min(TRACKS.length - 1, Math.round(st.s)));
            const settle = 1 - Math.min(1, Math.abs(st.s - index) * 2.2);
            const number = String(index + 1).padStart(2, '0');
            ctx.save();
            enterInfoGroup(ctx);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.translate(0, (1 - easeOut(show)) * 24);
            // track number, swapped for level bars once playing
            ctx.globalAlpha = show * (0.35 + 0.65 * settle) * (1 - st.play);
            ctx.fillStyle = rgba(st.accent, 1);
            ctx.font = slab(WEIGHT_HEAVY, 46);
            ctx.fillText(number, 2, INFO.songY - 2);
            if (st.play > 0) {
                ctx.globalAlpha = st.play;
                for (let b = 0; b < 3; b++) {
                    const level = 14 + 34 * st.running * (0.5 + 0.5 * Math.sin(st.clock * (9 + b * 2.7) + b * 1.9));
                    ctx.fillRect(2 + b * 19, INFO.songY - level, 11, level);
                }
                ctx.globalAlpha = st.play * 0.65;
                ctx.fillStyle = rgba(st.ink, 1);
                ctx.font = slab(WEIGHT_LIGHT, 34);
                const elapsed = Math.floor(st.clock);
                trackedText(ctx, `TRACK ${number}  ·  0:0${elapsed}`, 4, INFO.songY + 64, 4, 'left');
            }
            ctx.globalAlpha = show * (0.25 + 0.75 * settle);
            ctx.fillStyle = rgba(st.ink, 1);
            ctx.font = slab(700, 64);
            ctx.fillText(TRACKS[index], 82, INFO.songY);
            ctx.restore();
        }

        // ----- album dial: light face, tick marks, the selected album picked out in its own colour -----
        function drawWheel(ctx, st) {
            const appear = easeOut(seg(st.t, T.discIn1 - 0.4, T.discIn1 + 0.3)) * (1 - st.list) * (1 - st.tv);
            if (appear <= 0) return;
            const cy = WHEEL.y + (1 - st.wheel) * WHEEL.drop + (1 - appear) * 60;
            ctx.save();
            // grab handle hint while closed
            ctx.globalAlpha = (1 - st.wheel) * appear * 0.4;
            ctx.fillStyle = rgba(BLACK, 1);
            roundRect(ctx, W / 2 - 32, cy - WHEEL.rOut - 24, 64, 7, 3.5);
            ctx.fill();
            // face
            ctx.globalAlpha = appear;
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 36;
            ctx.shadowOffsetY = -4;
            circle(ctx, WHEEL.x, cy, WHEEL.rOut);
            ctx.fillStyle = WHEEL_FACE;
            ctx.fill();
            ctx.restore();
            ctx.lineWidth = 5;
            ctx.strokeStyle = rgba(WHITE, 1);
            circle(ctx, WHEEL.x, cy, WHEEL.rOut - 2.5);
            ctx.stroke();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = rgba(BLACK, 0.1);
            circle(ctx, WHEEL.x, cy, WHEEL.rOut - WHEEL.band);
            ctx.stroke();
            // ticks: a long one per album, short ones between
            const firstTick = Math.max(-2, Math.floor((st.p - 5) * WHEEL_MINOR));
            const lastTick = Math.min((ALBUMS.length - 1) * WHEEL_MINOR + 2, Math.ceil((st.p + 5) * WHEEL_MINOR));
            for (let q = firstTick; q <= lastTick; q++) {
                const position = q / WHEEL_MINOR;
                const major = q % WHEEL_MINOR === 0;
                const focus = major ? easeInOut(clamp01(1 - Math.abs(position - st.p))) : 0;
                const width = major ? lerp(3, 7, focus) : 2;
                ctx.save();
                ctx.translate(WHEEL.x, cy);
                ctx.rotate((position - st.p) * WHEEL_STEP);
                ctx.globalAlpha = appear * st.wheel;
                ctx.fillStyle = major ? rgba(mixRgb(BLACK, st.accent, focus), lerp(0.55, 1, focus)) : rgba(BLACK, 0.26);
                ctx.fillRect(-width / 2, -WHEEL.rOut + 10, width, major ? lerp(17, 24, focus) : 9);
                ctx.restore();
            }
            // letters
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ALBUMS.forEach((album, i) => {
                const angle = (i - st.p) * WHEEL_STEP;
                if (Math.abs(angle) > 0.6) return;
                const focus = easeInOut(clamp01(1 - Math.abs(i - st.p)));
                const size = lerp(WHEEL_FONT.rest, WHEEL_FONT.focus, focus);
                ctx.save();
                ctx.translate(WHEEL.x, cy);
                ctx.rotate(angle);
                ctx.font = isLatin(album.key) ? slab(focus > 0.5 ? WEIGHT_HEAVY : WEIGHT_LIGHT, size) : `900 ${size * 0.8}px ${FONT_CJK}`;
                ctx.fillStyle = rgba(BLACK, 1);
                ctx.globalAlpha = appear * st.wheel * lerp(0.55, 1, focus);
                ctx.fillText(album.key, 0, -WHEEL.rText);
                ctx.restore();
            });
            // fixed marker on the rim, in the selected album's colour
            ctx.globalAlpha = appear * st.wheel;
            ctx.lineCap = 'round';
            ctx.lineWidth = 7;
            ctx.strokeStyle = rgba(st.accent, 1);
            ctx.beginPath();
            ctx.arc(WHEEL.x, cy, WHEEL.rOut - 2.5, -Math.PI / 2 - WHEEL_STEP / 2, -Math.PI / 2 + WHEEL_STEP / 2);
            ctx.stroke();
            ctx.restore();
        }

        // ----- song list on an arc, ending at the play button -----
        function drawList(ctx, st, pose) {
            if (st.list <= 0) return;
            const open = st.listUi;
            const fade = open * open;
            const settle = st.listIn; // rows swing into place on the way in only
            ctx.save();
            ctx.fillStyle = rgba(BLACK, LIST_DIM * st.list);
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            TRACKS.forEach((title, i) => {
                const k = i - st.s;
                if (Math.abs(k) > LIST_VISIBLE) return;
                const phi = k * LIST_STEP * (1 + (1 - settle) * 1.4) + (1 - settle) * 0.5;
                const x = LIST.x - LIST_ARC_R * Math.cos(phi);
                const y = LIST.y + LIST_ARC_R * Math.sin(phi);
                const near = clamp01(1 - Math.abs(k));
                const size = lerp(LIST_FONT.rest, LIST_FONT.focus, near);
                ctx.globalAlpha = Math.pow(clamp01(1 - Math.abs(k) / LIST_VISIBLE), 1.5) * fade * lerp(0.62, 1, near);
                ctx.fillStyle = rgba(WHITE, 1);
                ctx.font = slab(WEIGHT_LIGHT, size * 0.72);
                ctx.fillText(String(i + 1).padStart(2, '0'), x, y + 1);
                ctx.font = slab(700, size);
                ctx.fillText(title, x + size * 1.3, y);
            });
            // outlined frame around the row that will play; it runs into the play button
            const flash = seg(st.t, T.selectFlash, T.selectFlash + 0.06) * (1 - seg(st.t, T.selectFlash + 0.12, T.selectFlash + 0.4));
            const left = LIST.x - LIST_ARC_R - 36 + (1 - settle) * 220;
            const half = LIST_FRAME_H / 2;
            ctx.globalAlpha = open;
            ctx.lineWidth = 3;
            ctx.strokeStyle = rgba(mixRgb(WHITE, st.accent, flash), 1);
            ctx.beginPath();
            ctx.moveTo(pose.x, LIST.y - half);
            ctx.lineTo(left + half, LIST.y - half);
            ctx.arc(left + half, LIST.y, half, -Math.PI / 2, Math.PI / 2, true);
            ctx.lineTo(pose.x, LIST.y + half);
            ctx.stroke();
            ctx.restore();
        }

        // ----- MV television: springs up from the bottom over the lower half of the deck -----
        // Screen shape: a rounded rectangle whose top and bottom bow out more than its sides.
        function crtPath(ctx, x, y, w, h, bulgeX, bulgeY, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.quadraticCurveTo(x + w / 2, y - bulgeY, x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.quadraticCurveTo(x + w + bulgeX, y + h / 2, x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.quadraticCurveTo(x + w / 2, y + h + bulgeY, x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.quadraticCurveTo(x - bulgeX, y + h / 2, x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        // Inner shadow: makes a shape read as sunk below its surround.
        function innerShadow(ctx, path, blur, dx, dy, alpha) {
            ctx.save();
            path();
            ctx.clip();
            ctx.shadowColor = `rgba(0,0,0,${alpha})`;
            ctx.shadowBlur = blur;
            ctx.shadowOffsetX = dx;
            ctx.shadowOffsetY = dy;
            ctx.lineWidth = 5;
            ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
            path();
            ctx.stroke();
            ctx.restore();
        }

        // Frosts whatever has been drawn so far (the deck), so the television sits clearly in front.
        // Halving averages neighbouring pixels and doubling spreads them again, which gives a smooth
        // blur in every browser without relying on canvas filters.
        function blurBackdrop(ctx, amount) {
            if (amount <= 0) return;
            const copy = (source, target) => {
                const c = target.getContext('2d');
                c.imageSmoothingEnabled = true;
                c.imageSmoothingQuality = 'high';
                c.globalCompositeOperation = 'copy';
                c.drawImage(source, 0, 0, target.width, target.height);
            };
            copy(ctx.canvas, blurLayers[0]);
            for (let level = 1; level < BLUR_LEVELS; level++) copy(blurLayers[level - 1], blurLayers[level]);
            for (let level = BLUR_LEVELS - 2; level >= 0; level--) copy(blurLayers[level + 1], blurLayers[level]);
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.globalAlpha = amount;
            ctx.drawImage(blurLayers[0], 0, 0, W, H);
            ctx.fillStyle = rgba(WHITE, 0.2);
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // Stand-in for the real music video (in the app a YouTube embed sits in this rectangle).
        function drawMvPicture(ctx, st, x, y, w, h) {
            const glow = glowColor(st.accent);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            const sky = ctx.createLinearGradient(x, y, x + w, y + h);
            sky.addColorStop(0, rgba(mixRgb(st.accent, BLACK, 0.6), 1));
            sky.addColorStop(1, rgba(mixRgb(st.accent, WHITE, 0.3), 1));
            ctx.fillStyle = sky;
            ctx.fillRect(x, y, w, h);
            const rnd = rng(77);
            for (let i = 0; i < 26; i++) {
                const speed = 12 + rnd() * 30;
                const size = 26 + rnd() * 90;
                const px = x + ((rnd() * (w + 200) + st.mvClock * speed) % (w + 200)) - 100;
                const py = y + rnd() * h + Math.sin(st.mvClock * (0.6 + rnd()) + i) * 14;
                const tone = rnd();
                const rgb = tone < 0.4 ? [255, 214, 110] : tone < 0.75 ? glow : WHITE;
                const g = ctx.createRadialGradient(px, py, 0, px, py, size);
                g.addColorStop(0, rgba(rgb, 0.55));
                g.addColorStop(0.6, rgba(rgb, 0.22));
                g.addColorStop(1, rgba(rgb, 0));
                ctx.fillStyle = g;
                circle(ctx, px, py, size);
                ctx.fill();
            }
            // caption + MV tag
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = rgba(WHITE, 1);
            ctx.font = slab(700, 34);
            ctx.fillText(TRACKS[TRACKS.length - 1], x + 30, y + h - 30);
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = rgba(WHITE, 0.9);
            roundRect(ctx, x + 28, y + 26, 64, 34, 8);
            ctx.stroke();
            ctx.font = slab(WEIGHT_HEAVY, 22);
            ctx.textAlign = 'center';
            ctx.fillText('MV', x + 60, y + 51);
            if (st.mvRunning < 1) {
                // held: picture dims, pause mark in the middle
                const held = 1 - st.mvRunning;
                ctx.fillStyle = rgba(BLACK, 0.4 * held);
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = rgba(WHITE, 0.92 * held);
                roundRect(ctx, x + w / 2 - 30, y + h / 2 - 38, 20, 76, 5);
                ctx.fill();
                roundRect(ctx, x + w / 2 + 10, y + h / 2 - 38, 20, 76, 5);
                ctx.fill();
            }
            ctx.restore();
        }

        // Channel-style dial: dark plate with a tick ring, a metal knob and a grip bar that shows its position.
        function drawTvDial(ctx, x, y, r, angle, lit, glow) {
            ctx.save();
            circle(ctx, x, y, TV.dialR + 7);
            ctx.fillStyle = '#0b0b0d';
            ctx.fill();
            ctx.lineWidth = BUTTONS.ringWidth;
            ctx.strokeStyle = rgba(mixRgb([74, 76, 82], glow, lit), 1);
            ctx.shadowColor = rgba(glow, 0.95 * lit);
            ctx.shadowBlur = 18 * lit;
            circle(ctx, x, y, TV.dialR + 2);
            ctx.stroke();
            ctx.shadowColor = 'transparent';
            for (let i = 0; i < 24; i++) {
                const long = i % 6 === 0;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate((i / 24) * TAU);
                ctx.fillStyle = rgba(WHITE, long ? 0.9 : 0.42);
                ctx.fillRect(-1.2, -TV.dialR + 5, 2.4, long ? 12 : 7);
                ctx.restore();
            }
            ctx.restore();
            metalKnob(ctx, x, y, r, 9);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 5;
            roundRect(ctx, -9, -r + 4, 18, r * 2 - 8, 8);
            ctx.fillStyle = cylinder(ctx, -9, 0, 9, 0, SILVER);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#2e3035';
            ctx.fillRect(-2, -r + 9, 4, 16);
            ctx.restore();
        }

        function drawTV(ctx, st) {
            if (st.tv <= 0) return;
            const rise = easeOutBack(st.tv);
            const glow = glowColor(st.accent);
            const picture = easeOut(seg(st.crt, 0.15, 1));
            const live = picture * (1 - seg(st.crtOff, 0, 0.2)); // lamps go out as the set switches off
            const { front, mask, glass, panel } = TV;
            const slope = (x0, y0, x1, y1, from, to) => {
                const g = ctx.createLinearGradient(x0, y0, x1, y1);
                g.addColorStop(0, from);
                g.addColorStop(1, to);
                return g;
            };
            const glassPath = () => crtPath(ctx, glass.x, glass.y, glass.w, glass.h, glass.bulgeX, glass.bulgeY, glass.corner);
            ctx.save();
            ctx.translate(TV.x, TV.y + (1 - rise) * (H - TV.y + 90));

            // antenna: two rods that spring out and settle
            const reach = easeOutBack(seg(st.t, T.tvIn0 + 0.3, T.tvIn1 + 0.25));
            const sway = Math.sin((st.t - T.tvIn1) * 10) * 0.06 * (1 - seg(st.t, T.tvIn1, T.tvIn1 + 1.3));
            TV.antenna.forEach(([dx, dy], i) => {
                if (reach <= 0) return;
                ctx.save();
                ctx.translate(TV.w / 2, 6);
                ctx.rotate(sway * (i ? 1 : -1));
                ctx.lineCap = 'round';
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 8;
                ctx.lineWidth = 8;
                ctx.strokeStyle = '#7d8087';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(dx * reach, dy * reach);
                ctx.stroke();
                ctx.shadowColor = 'transparent';
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#f1f2f4';
                ctx.beginPath();
                ctx.moveTo(-1.5, 0);
                ctx.lineTo(dx * reach - 1.5, dy * reach);
                ctx.stroke();
                const tip = ctx.createRadialGradient(dx * reach - 3, dy * reach - 3, 0, dx * reach, dy * reach, 11);
                tip.addColorStop(0, '#ffffff');
                tip.addColorStop(1, '#6f7279');
                circle(ctx, dx * reach, dy * reach, 10);
                ctx.fillStyle = tip;
                ctx.fill();
                ctx.restore();
            });
            roundRect(ctx, TV.w / 2 - 44, -14, 88, 30, 14);
            ctx.fillStyle = cylinder(ctx, 0, -14, 0, 16, SILVER);
            ctx.fill();

            // legs: tapered round bars splayed outwards. Each is built from short slices so the
            // light-to-dark shading always spans the leg's own width, however thin it gets.
            [[176, 1], [TV.w - 176, -1]].forEach(([lx, lean]) => {
                const length = (TV.legs + 22) / Math.cos(TV.legLean);
                const halfAt = (k) => lerp(27, 12, k);
                ctx.save();
                ctx.translate(lx, TV.h - 22);
                ctx.rotate(TV.legLean * lean);
                for (let i = 0; i < TV.legSlices; i++) {
                    const k0 = i / TV.legSlices;
                    const k1 = (i + 1) / TV.legSlices;
                    const half = halfAt((k0 + k1) / 2);
                    ctx.beginPath();
                    ctx.moveTo(-halfAt(k0), k0 * length - 0.5);
                    ctx.lineTo(halfAt(k0), k0 * length - 0.5);
                    ctx.lineTo(halfAt(k1), k1 * length + 0.5);
                    ctx.lineTo(-halfAt(k1), k1 * length + 0.5);
                    ctx.closePath();
                    ctx.fillStyle = cylinder(ctx, -half, 0, half, 0, SILVER);
                    ctx.fill();
                }
                // darker where the leg meets the underside of the set
                ctx.beginPath();
                ctx.moveTo(-halfAt(0), 0);
                ctx.lineTo(halfAt(0), 0);
                ctx.lineTo(halfAt(1), length);
                ctx.lineTo(-halfAt(1), length);
                ctx.closePath();
                ctx.fillStyle = slope(0, 14, 0, length * 0.75, 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)');
                ctx.fill();
                // rubber foot
                roundRect(ctx, -halfAt(1) - 1, length - 9, halfAt(1) * 2 + 2, 12, 4);
                ctx.fillStyle = '#1c1d20';
                ctx.fill();
                ctx.restore();
            });

            // shell: chamfered aluminium
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 80;
            ctx.shadowOffsetY = -4;
            roundRect(ctx, 0, 0, TV.w, TV.h, TV.corner);
            ctx.fillStyle = '#b9bcc2';
            ctx.fill();
            ctx.restore();
            roundRect(ctx, 0, 0, TV.w, TV.h, TV.corner);
            ctx.fillStyle = slope(0, 0, TV.w, TV.h, '#ffffff', '#989ba2');
            ctx.fill();
            roundRect(ctx, 8, 8, TV.w - 16, TV.h - 16, TV.corner - 7);
            ctx.fillStyle = slope(0, 0, TV.w, TV.h, '#8b8e95', '#f7f8f9');
            ctx.fill();
            roundRect(ctx, 15, 15, TV.w - 30, TV.h - 30, TV.corner - 13);
            ctx.fillStyle = slope(0, 15, 0, TV.h, '#f4f5f6', '#d3d5d9');
            ctx.fill();

            // dark front, sunk into the shell
            const frontPath = () => roundRect(ctx, front.x, front.y, front.w, front.h, 34);
            frontPath();
            ctx.fillStyle = slope(front.x, front.y, front.x, front.y + front.h, '#2a2b2f', '#141416');
            ctx.fill();
            innerShadow(ctx, frontPath, 22, 5, 9, 0.85);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            frontPath();
            ctx.stroke();

            // surround: warm-white moulding that slopes in towards the glass
            const maskPath = (inset) => crtPath(ctx, mask.x + inset, mask.y + inset, mask.w - inset * 2, mask.h - inset * 2, 5, 9, 66 - inset * 0.5);
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 7;
            maskPath(0);
            ctx.fillStyle = slope(mask.x, mask.y, mask.x + mask.w, mask.y + mask.h, '#fbfaf6', '#c4c1b8');
            ctx.fill();
            ctx.restore();
            maskPath(12);
            ctx.fillStyle = slope(mask.x, mask.y, mask.x + mask.w, mask.y + mask.h, '#d8d5cc', '#f6f4ee');
            ctx.fill();
            maskPath(22);
            ctx.fillStyle = slope(mask.x, mask.y, mask.x, mask.y + mask.h, '#c9c6bd', '#ebe8e1');
            ctx.fill();
            // black gasket between surround and glass
            crtPath(ctx, glass.x - 10, glass.y - 10, glass.w + 20, glass.h + 20, glass.bulgeX, glass.bulgeY, glass.corner + 8);
            ctx.fillStyle = '#0a0a0b';
            ctx.fill();

            // glass
            ctx.save();
            glassPath();
            ctx.clip();
            const tube = ctx.createRadialGradient(glass.x + glass.w * 0.45, glass.y + glass.h * 0.4, 20, glass.x + glass.w / 2, glass.y + glass.h / 2, glass.w * 0.7);
            tube.addColorStop(0, '#222b2e');
            tube.addColorStop(1, '#080b0c');
            ctx.fillStyle = tube;
            ctx.fillRect(glass.x - 30, glass.y - 30, glass.w + 60, glass.h + 60);
            const videoH = (glass.w * 9) / 16;
            const videoY = glass.y + (glass.h - videoH) / 2;
            const midY = videoY + videoH / 2;
            // switching off: the picture squashes to a line, the line shrinks to a dot, the dot dies away
            const collapseY = 1 - easeIn(seg(st.crtOff, 0, 0.5));
            const collapseX = 1 - easeIn(seg(st.crtOff, 0.42, 0.82));
            const ember = 1 - seg(st.crtOff, 0.82, 1);
            const midX = glass.x + glass.w / 2;
            if (st.crt > 0 && ember > 0) {
                // (switching on runs the other way: a bright line that opens into the picture)
                ctx.save();
                ctx.translate(midX, midY);
                ctx.scale(Math.max(0.012, collapseX), Math.max(0.012, picture * collapseY));
                ctx.translate(-midX, -midY);
                drawMvPicture(ctx, st, glass.x - 10, videoY, glass.w + 20, videoH);
                if (st.crtOff > 0) {
                    ctx.fillStyle = rgba(WHITE, Math.min(1, st.crtOff * 2.6)); // burns to white as it collapses
                    ctx.fillRect(glass.x - 10, videoY, glass.w + 20, videoH);
                }
                ctx.restore();
                if (st.crtOff > 0.3) {
                    const halfW = Math.max(5, (glass.w / 2) * collapseX);
                    ctx.save();
                    ctx.globalAlpha = ember;
                    ctx.shadowColor = 'rgba(255,255,255,0.95)';
                    ctx.shadowBlur = 28;
                    ctx.fillStyle = '#ffffff';
                    roundRect(ctx, midX - halfW, midY - 4, halfW * 2, 8, 4);
                    ctx.fill();
                    ctx.restore();
                }
                const flash = seg(st.crt, 0, 0.15) * (1 - picture);
                if (flash > 0) {
                    const band = Math.max(6, videoH * picture);
                    ctx.fillStyle = rgba(WHITE, 0.9 * flash);
                    ctx.fillRect(glass.x - 10, midY - band / 2, glass.w + 20, band);
                }
            }
            ctx.fillStyle = 'rgba(0,0,0,0.11)';
            for (let y = glass.y - 24; y < glass.y + glass.h + 24; y += 4) ctx.fillRect(glass.x - 10, y, glass.w + 20, 1.5);
            const vignette = ctx.createRadialGradient(glass.x + glass.w / 2, glass.y + glass.h / 2, glass.h * 0.32, glass.x + glass.w / 2, glass.y + glass.h / 2, glass.w * 0.74);
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
            ctx.fillStyle = vignette;
            ctx.fillRect(glass.x - 30, glass.y - 30, glass.w + 60, glass.h + 60);
            // reflections on the curved glass: a soft window of light and a bright rim along the top bow
            const glare = ctx.createLinearGradient(glass.x, glass.y, glass.x + glass.w * 0.55, glass.y + glass.h * 0.75);
            glare.addColorStop(0, 'rgba(255,255,255,0.24)');
            glare.addColorStop(0.4, 'rgba(255,255,255,0.04)');
            glare.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = glare;
            ctx.fillRect(glass.x - 30, glass.y - 30, glass.w + 60, glass.h + 60);
            ctx.lineCap = 'round';
            ctx.shadowColor = 'rgba(255,255,255,0.5)';
            ctx.shadowBlur = 22;
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(255,255,255,0.16)';
            ctx.beginPath();
            ctx.moveTo(glass.x + 70, glass.y + 26);
            ctx.quadraticCurveTo(glass.x + glass.w / 2, glass.y + 26 - glass.bulgeY * 1.3, glass.x + glass.w - 70, glass.y + 26);
            ctx.stroke();
            ctx.shadowColor = 'transparent';
            ctx.restore();
            innerShadow(ctx, glassPath, 26, 4, 8, 0.9);

            // control panel
            const panelPath = () => roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 26);
            panelPath();
            ctx.fillStyle = slope(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h, '#34363b', '#1b1c1f');
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = slope(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.12)');
            ctx.stroke();
            // speaker slots
            for (let y = panel.y + 24; y < panel.y + 136; y += 15) {
                roundRect(ctx, panel.x + 22, y, panel.w - 44, 6, 3);
                ctx.fillStyle = '#050506';
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.fillRect(panel.x + 24, y + 6, panel.w - 48, 1.2);
            }
            // the two dials: volume and skip
            drawTvDial(ctx, TV.knobX, TV.knobY[0], TV.knobR, 0.45, 0, glow);
            drawTvDial(ctx, TV.knobX, TV.knobY[1], TV.knobR, -1.1 + st.mvClock * 0.2, 0, glow);
            ctx.fillStyle = 'rgba(255,255,255,0.78)';
            const volumeY = TV.knobY[0] + TV.dialR + 24;
            ctx.beginPath(); // speaker mark
            ctx.moveTo(TV.knobX - 15, volumeY - 4);
            ctx.lineTo(TV.knobX - 9, volumeY - 4);
            ctx.lineTo(TV.knobX - 1, volumeY - 10);
            ctx.lineTo(TV.knobX - 1, volumeY + 10);
            ctx.lineTo(TV.knobX - 9, volumeY + 4);
            ctx.lineTo(TV.knobX - 15, volumeY + 4);
            ctx.closePath();
            ctx.fill();
            ctx.lineWidth = 2.2;
            ctx.strokeStyle = 'rgba(255,255,255,0.78)';
            [7, 13].forEach((radius) => {
                ctx.beginPath();
                ctx.arc(TV.knobX + 1, volumeY, radius, -0.8, 0.8);
                ctx.stroke();
            });
            const skipY = TV.knobY[1] + TV.dialR + 24;
            playIcon(ctx, TV.knobX - 10, skipY, 15);
            playIcon(ctx, TV.knobX + 5, skipY, 15);
            ctx.fillRect(TV.knobX + 15, skipY - 7.5, 4, 15);
            // transport: three push buttons — play, pause, stop. The one in effect is lit.
            const pressAt = (time) => seg(st.t, time - 0.12, time) * (1 - seg(st.t, time, time + 0.15));
            const stopped = seg(st.crtOff, 0, 0.2);
            [
                { icon: 'play', lit: st.mvRunning * live, press: pressAt(T.mvResume) },
                { icon: 'pause', lit: (1 - st.mvRunning) * live, press: pressAt(T.mvPause) },
                { icon: 'stop', lit: stopped * (1 - seg(st.t, T.crtOff1, T.crtOff1 + 0.15)), press: pressAt(T.crtOff0) },
            ].forEach((button, i) => {
                const x = TV.knobX + (i - 1) * TV.buttonGap;
                const y = TV.buttonY;
                const r = TV.buttonR * (1 - button.press * 0.08);
                ctx.save();
                ctx.lineWidth = 2.6;
                ctx.strokeStyle = rgba(mixRgb([74, 76, 82], glow, button.lit), 1);
                ctx.shadowColor = rgba(glow, 0.95 * button.lit);
                ctx.shadowBlur = 14 * button.lit;
                circle(ctx, x, y, TV.buttonR + 4.5);
                ctx.stroke();
                ctx.restore();
                metalKnob(ctx, x, y, r, 4);
                ctx.fillStyle = rgba(mixRgb([44, 46, 52], BLACK, 0.3), 1);
                if (button.icon === 'play') playIcon(ctx, x + 1, y, 13);
                else if (button.icon === 'pause') {
                    ctx.fillRect(x - 6, y - 6.5, 4.2, 13);
                    ctx.fillRect(x + 1.8, y - 6.5, 4.2, 13);
                } else ctx.fillRect(x - 5.5, y - 5.5, 11, 11);
            });

            // lower strip: progress line, lamp, what is on, time; then a row of vents
            const stripY = front.y + front.h;
            roundRect(ctx, 70, stripY + 26, 676, 6, 3);
            ctx.fillStyle = rgba(BLACK, 0.14);
            ctx.fill();
            roundRect(ctx, 70, stripY + 26, Math.max(6, 676 * clamp01(st.mvClock / DEMO_MV_SECONDS)), 6, 3);
            ctx.fillStyle = rgba(st.accent, 1);
            ctx.fill();
            ctx.save();
            ctx.shadowColor = rgba(glow, 0.9 * live * st.mvRunning);
            ctx.shadowBlur = 16;
            circle(ctx, 86, stripY + 84, 9);
            ctx.fillStyle = rgba(mixRgb([150, 152, 158], glow, live * st.mvRunning), 1);
            ctx.fill();
            ctx.restore();
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
            ctx.fillStyle = rgba(BLACK, 1);
            ctx.font = slab(WEIGHT_HEAVY, 40);
            ctx.fillText('MV', 114, stripY + 98);
            ctx.font = slab(700, 44);
            ctx.fillText(TRACKS[TRACKS.length - 1], 194, stripY + 99);
            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.font = slab(WEIGHT_LIGHT, 40);
            trackedText(ctx, `0:0${Math.floor(st.mvClock)}`, 746, stripY + 98, 3, 'right');
            ctx.restore();
            for (let x = 70; x < 500; x += 20) {
                roundRect(ctx, x, stripY + 138, 12, 5, 2.5);
                ctx.fillStyle = 'rgba(20,21,24,0.6)';
                ctx.fill();
            }
            ctx.restore();
        }

        // ----- touch indicator (reads on both white and black) -----
        function drawTouches(ctx, t, beneathTv) {
            TOUCHES.forEach((touch) => {
                if (Boolean(touch.beneathTv) !== beneathTv) return; // the MV button's touch is covered by the TV as it rises
                const isTap = touch.from[0] === touch.to[0] && touch.from[1] === touch.to[1];
                const k = easeInOut(seg(t, touch.t0, touch.t1));
                const x = lerp(touch.from[0], touch.to[0], k);
                const y = lerp(touch.from[1], touch.to[1], k);
                const a = seg(t, touch.t0 - 0.16, touch.t0) * (1 - seg(t, touch.t1, touch.t1 + 0.22));
                if (a > 0) {
                    const down = t >= touch.t0 && t <= touch.t1 + 0.04;
                    ctx.save();
                    ctx.globalAlpha = a;
                    ctx.shadowColor = 'rgba(0,0,0,0.35)';
                    ctx.shadowBlur = 14;
                    circle(ctx, x, y, down ? 34 : 42);
                    ctx.fillStyle = down ? 'rgba(128,128,128,0.6)' : 'rgba(128,128,128,0.4)';
                    ctx.fill();
                    ctx.shadowColor = 'transparent';
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
                    ctx.stroke();
                    ctx.restore();
                }
                if (isTap) {
                    const ripple = seg(t, touch.t1, touch.t1 + 0.5);
                    if (ripple > 0 && ripple < 1) {
                        ctx.save();
                        ctx.globalAlpha = (1 - ripple) * 0.8;
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = 'rgba(140,140,140,1)';
                        circle(ctx, x, y, 38 + easeOut(ripple) * 100);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            });
        }

        // ----- preload flag: waves, then fades out as one piece -----
        function drawFlag(ctx, t) {
            const fade = easeInOut(seg(t, T.flagFade0, T.flagFade1));
            if (fade >= 1) return;
            const gust = lerp(0.7, 1, easeOut(seg(t, 0, 1)));
            shadeFlag(flag, t, gust);
            composeFlag(flag);
            projectFlag(flag, t, gust);
            const layer = flag.layerCtx;
            layer.fillStyle = '#000';
            layer.fillRect(0, 0, W, H);
            drawFlagMesh(layer, flag);
            // loading hairline
            const a = seg(t, 0.2, 0.5);
            const done = easeInOut(seg(t, T.loadStart, T.loadEnd));
            layer.save();
            layer.globalAlpha = a;
            layer.fillStyle = 'rgba(255,255,255,0.22)';
            layer.fillRect(W / 2 - 170, 1716, 340, 3);
            layer.fillStyle = '#fff';
            layer.fillRect(W / 2 - 170, 1716, 340 * done, 3);
            layer.font = slab(WEIGHT_LIGHT, 28);
            layer.textBaseline = 'alphabetic';
            layer.globalAlpha = a * 0.8;
            trackedText(layer, String(Math.round(done * 100)).padStart(3, '0'), W / 2 + 170, 1694, 3, 'right');
            layer.restore();
            const zoom = 1 + fade * 0.05;
            ctx.save();
            ctx.globalAlpha = 1 - fade;
            ctx.translate(W / 2, H / 2);
            ctx.scale(zoom, zoom);
            ctx.drawImage(flag.layer, -W / 2, -H / 2);
            ctx.restore();
        }

        function draw(ctx, time) {
            const t = Math.max(0, Math.min(DURATION, time));
            const st = state(t);
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            if (t > T.flagFade0 - 0.05) {
                const focusIndex = Math.max(0, Math.min(ALBUMS.length - 1, Math.round(st.p)));
                const focusPose = discPose(focusIndex, st);
                drawBackground(ctx, st, focusPose);
                drawDiscs(ctx, st);
                drawList(ctx, st, focusPose);
                drawHubButton(ctx, st, focusPose);
                drawHomeFixtures(ctx, st);
                drawVersion(ctx, st);
                ALBUMS.forEach((album, i) => drawAlbumTitle(ctx, st, i));
                drawSongLine(ctx, st);
                drawWheel(ctx, st);
                drawTouches(ctx, t, true);
                blurBackdrop(ctx, st.tvBlur);
                drawTV(ctx, st);
                drawTouches(ctx, t, false);
            }
            drawFlag(ctx, t);
            const fade = Math.max(1 - seg(t, 0, T.fadeIn), seg(t, T.fadeOut0, DURATION));
            if (fade > 0) {
                ctx.fillStyle = `rgba(0,0,0,${fade})`;
                ctx.fillRect(0, 0, W, H);
            }
            ctx.restore();
        }

        return {
            draw,
            /** Show a real cover image on the disc of album `index`. */
            setCover(index, image) {
                art[index] = makeCoverArt(mk, image);
            },
            /** Colour the interface borrows from album `index`: [r, g, b], or null for the preset. */
            setAccent(index, rgb) {
                accents[index] = rgb || presetAccents[index];
            },
            /** Back to stand-in art for every album not listed in `keep`; also re-measures type. */
            refreshArt(keep) {
                ALBUMS.forEach((album, i) => {
                    if (!keep || !keep[i]) art[i] = makePlaceholderArt(mk, album, i);
                });
                titleFit = {};
            },
        };
    }

    return { W, H, DURATION, ALBUMS, TRACKS, create };
});
