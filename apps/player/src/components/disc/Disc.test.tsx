import { render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Disc } from './Disc';

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

    // 碟係空心：封面由銀邊（0.972）去到透明膠圈（0.16），用 even-odd 挖走中間
    it('should clip the cover to a ring between the rim and the clear hub', () => {
        const container = renderDisc();
        const clip = container.querySelector('clipPath path');
        expect(clip).toHaveAttribute('clip-rule', 'evenodd');
        expect(clip?.getAttribute('d')).toContain('M-680.4 0');
        expect(clip?.getAttribute('d')).toContain('M-112 0');
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
