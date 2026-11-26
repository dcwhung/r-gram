import { useCallback, useRef } from 'react';
import { APP_VERSION } from '../config/appVersion';
import { usePlayer } from './audio/usePlayer';
import { mediaBaseFrom } from './config';
import { isStandalone } from './env';
import { AutoNextItem } from './items/AutoNextItem';
import { FpsItem } from './items/FpsItem';
import { LandscapeItem } from './items/LandscapeItem';
import { MediaSessionItem } from './items/MediaSessionItem';
import { UnlockItem } from './items/UnlockItem';
import { VideoGainItem } from './items/VideoGainItem';
import { MediaSection } from './media/MediaSection';
import { useMedia } from './media/useMedia';
import { ResultsPanel } from './results/ResultsPanel';
import { SpikeProvider } from './results/store';
import { TEXT } from './text';

const MEDIA_BASE = mediaBaseFrom(window.location.search);

const SpikeItems = () => {
    const { fields, setFields, found, searching, rescan, media } = useMedia(MEDIA_BASE);
    const audioRef = useRef<HTMLAudioElement>(null);
    const audio = useCallback(() => audioRef.current, []);
    const player = usePlayer(audioRef, media);
    return (
        <>
            <MediaSection
                base={MEDIA_BASE}
                fields={fields}
                setFields={setFields}
                found={found}
                searching={searching}
                rescan={rescan}
            />
            {/* 1–3 共用嘅唯一一個 <audio>（產品做法） */}
            <audio ref={audioRef} playsInline preload="auto" />
            <UnlockItem audio={audio} player={player} media={media} />
            <AutoNextItem player={player} media={media} />
            <MediaSessionItem player={player} audio={audio} media={media} />
            <VideoGainItem media={media} />
            <FpsItem media={media} />
            <LandscapeItem />
        </>
    );
};

/** T-010 真機 spike 頁（用完即棄；app 冇連結、唔註冊 Service Worker） */
export const SpikeApp = () => (
    <SpikeProvider>
        <main className="spike">
            <h1>{TEXT.title}</h1>
            <p className="spike-how">{TEXT.intro}</p>
            <p className="spike-mono">
                {TEXT.modeLine(isStandalone() ? TEXT.modeStandalone : TEXT.modeTab, APP_VERSION)}
            </p>
            <SpikeItems />
            <ResultsPanel mediaBase={MEDIA_BASE} />
        </main>
    </SpikeProvider>
);
