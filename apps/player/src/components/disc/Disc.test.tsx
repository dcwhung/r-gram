import { render } from '@testing-library/react';
import { PHONE_LAYOUT } from '../../stage/layouts';
import { Disc } from './Disc';

const renderDisc = (props: Partial<Parameters<typeof Disc>[0]> = {}) =>
    render(
        <svg>
            <Disc
                r={700}
                hub={PHONE_LAYOUT.hub}
                coverUrl={null}
                accent="#2f8f57"
                spinning={false}
                {...props}
            />
        </svg>,
    ).container;

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

    it('should spin the cover only while playing', () => {
        expect(renderDisc().querySelector('[data-part="cover"]')).not.toHaveClass('disc-spinning');
        expect(renderDisc({ spinning: true }).querySelector('[data-part="cover"]')).toHaveClass(
            'disc-spinning',
        );
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
