import { glowColor } from '@r-gram/catalog';
import { useState } from 'react';
import { Disc } from '../components/disc/Disc';
import { MetalButton } from '../components/metal-button/MetalButton';
import { Screws } from '../components/metal/Screws';
import { Platter } from '../components/platter/Platter';
import { Spindle, type SpindleMode } from '../components/spindle/Spindle';
import { Tonearm } from '../components/tonearm/Tonearm';
import { t } from '../i18n/t';
import { DESIGN_HEIGHT } from '../stage/fitStage';
import { hitSizeUnits } from '../stage/geometry';
import { PHONE_LAYOUT as LAYOUT } from '../stage/layouts';
import { StageSvg } from '../stage/StageSvg';

/** 暫時嘅示範值：未接 catalog 同播放（T-031、T-038） */
const DEMO_ACCENT = '#2f8a4f';
const DEMO_PROGRESS = 0.19;
const NEXT_MODE: Readonly<Record<SpindleMode, SpindleMode>> = {
    idle: 'playing',
    list: 'playing',
    playing: 'paused',
    paused: 'playing',
};

const isLowerHalf = ({ y }: { y: number }) => y > DESIGN_HEIGHT / 2;

const Buttons = ({ mode, glow }: { mode: SpindleMode; glow: string }) => {
    const hasSong = mode !== 'idle';
    const [booklet, mv, playMode] = LAYOUT.buttons.items;
    const common = {
        glow,
        metrics: LAYOUT.buttons,
        hitRadius: hitSizeUnits(LAYOUT) / 2,
        onPress: () => {},
    };
    if (!booklet || !mv || !playMode) return null;
    return (
        <>
            <MetalButton
                {...common}
                {...booklet}
                icon="info"
                label={t('booklet.open')}
                disabled={!hasSong}
            />
            <MetalButton {...common} {...mv} icon="mv" label={t('mv.open')} disabled={!hasSong} />
            <MetalButton
                {...common}
                {...playMode}
                icon="order"
                label={t('mode.label', { mode: t('mode.order') })}
                lit={mode === 'playing'}
            />
        </>
    );
};

/**
 * 暫時嘅唱片機外殼（T-033）：將基本元件放上舞台，㩒唱片夾可以試「未揀歌 → 播緊 ⇄ 暫停」。
 * 正式嘅主頁（左上資訊、轉碟旋鈕、接場景狀態機同播放）喺 T-035 取代呢個檔。
 */
export const TurntableShell = () => {
    const [mode, setMode] = useState<SpindleMode>('idle');
    const glow = glowColor(DEMO_ACCENT);
    const playing = mode === 'playing';
    const { disc, hub, screws } = LAYOUT;
    return (
        <StageSvg
            top={<Screws points={screws.points.filter((point) => !isLowerHalf(point))} />}
            bottom={
                <>
                    <Screws points={screws.points.filter(isLowerHalf)} />
                    <Platter disc={disc} platter={LAYOUT.platter} />
                    <g transform={`translate(${disc.x} ${disc.y})`}>
                        <Disc
                            r={disc.r}
                            hub={hub}
                            coverUrl={null}
                            accent={DEMO_ACCENT}
                            spinning={playing}
                        />
                    </g>
                    <Spindle
                        layout={LAYOUT}
                        mode={mode}
                        progress={DEMO_PROGRESS}
                        accent={DEMO_ACCENT}
                        onPress={() => setMode(NEXT_MODE[mode])}
                    />
                    <Tonearm arm={LAYOUT.arm} playing={playing} glow={glow} />
                    <Buttons mode={mode} glow={glow} />
                </>
            }
        />
    );
};
