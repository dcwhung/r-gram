import { render } from '@testing-library/react';
import { fitStage } from '../../stage/fitStage';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { StageContext } from '../../stage/StageContext';
import { estimateTextWidth } from '../../utils/textMeasure';
import { px } from '../svgNumber';
import { ArcTrackList } from './ArcTrackList';

/** iPhone 15 主畫面 App：393 × 852，安全區頂 59、底 34 */
const FIT = fitStage(393, 852, { top: 59, bottom: 34 });

const renderVeil = () => {
    const { container } = render(
        <StageContext.Provider value={FIT}>
            <svg>
                <ArcTrackList
                    layout={PHONE_LAYOUT}
                    list={{
                        albumId: 'komorebi',
                        accent: '#2f8f57',
                        rows: [],
                        focusIndex: 0,
                        emptyText: '尚未有歌曲',
                        fromColumn: false,
                    }}
                    albumTitle="KOMOREBI"
                    measure={estimateTextWidth}
                    floating={false}
                    onClose={vi.fn()}
                    onFocusTrack={vi.fn()}
                    onPlay={vi.fn()}
                />
            </svg>
        </StageContext.Provider>,
    );
    return container.querySelector('[data-part="arc-veil"]') as SVGPathElement;
};

/* T-117（B-094）：歌單嘅暗層蓋埋螢幕頂同底嘅延伸，唔好有未壓暗嘅唱片機喺狀態列、底部橫條後面 */
describe('ArcTrackList veil bleed', () => {
    it('should darken from the top of the screen to the bottom (bottom-anchored group)', () => {
        const top = px(-FIT.extraUnits - FIT.bleedTop);
        const bottom = px(
            -FIT.extraUnits - FIT.bleedTop + FIT.bleedTop + FIT.heightUnits + FIT.bleedBottom,
        );
        expect(renderVeil().getAttribute('d')).toMatch(new RegExp(`^M0 ${top}H1080V${bottom}H0z`));
    });
});
