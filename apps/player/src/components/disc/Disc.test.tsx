import { render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Disc } from './Disc';
import { DISC_ART_RADIUS } from './discArt';

type DiscProps = Parameters<typeof Disc>[0];

const discIn = (props: Partial<DiscProps> = {}) => (
    <svg>
        <Disc
            r={700}
            hub={PHONE_LAYOUT.hub}
            coverUrl={null}
            accent="#2f8f57"
            spinning={false}
            {...props}
        />
    </svg>
);

const renderDisc = (props: Partial<DiscProps> = {}) => render(discIn(props)).container;

describe('Disc', () => {
    it('should show the cover image when there is one', () => {
        const container = renderDisc({ coverUrl: 'https://api.example/img/abc.webp' });
        expect(container.querySelector('image')).toHaveAttribute(
            'href',
            'https://api.example/img/abc.webp',
        );
    });

    it('should fall back to the album colour when there is no cover', () => {
        const container = renderDisc();
        expect(container.querySelector('image')).toBeNull();
        expect(container.querySelector('[data-part="cover-fill"]')).toHaveAttribute(
            'fill',
            '#2f8f57',
        );
    });

    // 碟係空心：封面由銀邊（0.972）去到透明膠圈（0.16），用 even-odd 挖走中間。以設計稿 ART = 500 畫
    it('should clip the cover to a ring between the rim and the clear hub', () => {
        const container = renderDisc();
        const clip = container.querySelector('clipPath path');
        expect(clip).toHaveAttribute('clip-rule', 'evenodd');
        expect(clip?.getAttribute('d')).toContain('M-486 0');
        expect(clip?.getAttribute('d')).toContain('M-80 0');
    });

    /* W-010：設計稿每隻碟以 ART = 500 畫，再由外層 scale(r / ART) 放大，線粗、落影、模糊跟住縮放 */
    describe('art scale', () => {
        const art = (r: number) => renderDisc({ r }).querySelector('[data-part="disc-art"]');
        /** 兩隻碟嘅 clip id 唔同，比較之前換走 */
        const markup = (r: number) => art(r)?.innerHTML.replace(/disc-clip-\w+/g, 'clip');

        it.each([
            [700, 'scale(1.4)'],
            [504, 'scale(1.008)'],
            [DISC_ART_RADIUS, 'scale(1)'],
        ])('should scale the art drawn at radius 500 up to a radius of %d', (r, transform) => {
            expect(art(r)).toHaveAttribute('transform', transform);
        });

        it('should draw the same art whatever the radius', () => {
            expect(markup(700)).toContain('<circle');
            expect(markup(504)).toBe(markup(700));
        });

        it.each([
            ['edge', '500', '1.2'],
            ['clear-edge', '78.5', '2.5'],
            ['clear-inner', '73', '2.5'],
            ['hole', '59', '1.5'],
        ])('should draw the %s line with the mockup radius and width', (part, r, width) => {
            const line = art(700)?.querySelector(`[data-part="${part}"]`);
            expect(line).toHaveAttribute('r', r);
            expect(line).toHaveAttribute('stroke-width', width);
        });

        it('should drop the shadow by the mockup offset and size the cover to the art', () => {
            const shadow = art(700)?.querySelector('[data-part="shadow"]');
            expect(shadow).toHaveAttribute('transform', 'translate(0 8)');
            expect(shadow?.getAttribute('d')).toContain('M-500 0');
            expect(shadow?.getAttribute('d')).toContain('M-59 0');
            expect(art(700)?.querySelector('[data-part="cover-fill"]')).toHaveAttribute('r', '500');
        });

        it('should size the cover image to the art', () => {
            const image = renderDisc({
                coverUrl: 'https://api.example/img/abc.webp',
            }).querySelector('image');
            expect(image).toHaveAttribute('x', '-500');
            expect(image).toHaveAttribute('width', '1000');
        });
    });

    // W-011：暫停要停喺原位。動畫長駐喺封面，播定停只改 data-spinning（CSS 用佢切換 animation-play-state）
    it('should keep the same animated cover and only flag whether it is turning', () => {
        const { container, rerender } = render(discIn({ spinning: true }));
        const cover = container.querySelector('[data-part="cover"]');
        expect(cover).toHaveClass('disc-cover');
        expect(cover).toHaveAttribute('data-spinning', 'true');

        rerender(discIn({ spinning: false }));
        expect(container.querySelector('[data-part="cover"]')).toBe(cover);
        expect(cover?.getAttribute('class')).toBe('disc-cover');
        expect(cover).toHaveAttribute('data-spinning', 'false');
    });

    it('should give each disc its own clip path id', () => {
        const container = render(
            <svg>
                <Disc
                    r={700}
                    hub={PHONE_LAYOUT.hub}
                    coverUrl={null}
                    accent="#111111"
                    spinning={false}
                />
                <Disc
                    r={700}
                    hub={PHONE_LAYOUT.hub}
                    coverUrl={null}
                    accent="#222222"
                    spinning={false}
                />
            </svg>,
        ).container;
        const ids = [...container.querySelectorAll('clipPath')].map((clip) => clip.id);
        expect(new Set(ids).size).toBe(2);
    });
});
