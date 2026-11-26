import { useState } from 'react';
import { LandscapeOverlay } from '../landscape/LandscapeOverlay';
import { TEXT } from '../text';
import { Section } from './Section';

/** ⑥ 手機打橫：反方向轉嘅舞台（D96、R-026） */
export const LandscapeItem = () => {
    const [open, setOpen] = useState(false);
    return (
        <Section item="6" title={TEXT.landscape.title} how={TEXT.landscape.how}>
            <button
                type="button"
                className="spike-button spike-button--main"
                onClick={() => setOpen(true)}
            >
                {TEXT.landscape.open}
            </button>
            {open ? <LandscapeOverlay onClose={() => setOpen(false)} /> : null}
        </Section>
    );
};
