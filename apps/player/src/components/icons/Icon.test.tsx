import { render } from '@testing-library/react';
import { Icon, ICON_NAMES } from './Icon';

describe('Icon', () => {
    it('should offer the icons the confirmed design uses', () => {
        expect([...ICON_NAMES].sort()).toEqual([
            'all',
            'heart',
            'info',
            'mv',
            'one',
            'order',
            'shuffle',
        ]);
    });

    it.each(ICON_NAMES)(
        'should draw the %s icon centred and scaled from its 48-unit grid',
        (name) => {
            const { container } = render(
                <svg>
                    <Icon name={name} cx={112} cy={1380} size={52} color="#262626" />
                </svg>,
            );
            const group = container.querySelector('[data-part="icon"]');
            expect(group).toHaveAttribute('fill', '#262626');
            expect(group?.getAttribute('transform')).toBe(
                'translate(112 1380) translate(-26 -26) scale(1.0833)',
            );
            expect(group?.querySelectorAll('path, circle').length).toBeGreaterThan(0);
        },
    );
});
