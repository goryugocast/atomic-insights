import { describe, expect, it } from 'vitest';
import { FooterRegistry } from '../src/FooterRegistry';

type View = { id: string };

class FakeFooter {
    removed = false;

    remove(): void {
        this.removed = true;
    }
}

describe('FooterRegistry', () => {
    it('keeps one independently owned footer per markdown view', () => {
        const registry = new FooterRegistry<View, FakeFooter>();
        const left = { id: 'left' };
        const right = { id: 'right' };
        const leftFooter = new FakeFooter();
        const rightFooter = new FakeFooter();

        expect(registry.getOrCreate(left, () => leftFooter)).toBe(leftFooter);
        expect(registry.getOrCreate(right, () => rightFooter)).toBe(rightFooter);
        expect(registry.getOrCreate(left, () => new FakeFooter())).toBe(leftFooter);
        expect(registry.size).toBe(2);
    });

    it('removes the footer for the requested view only', () => {
        const registry = new FooterRegistry<View, FakeFooter>();
        const left = { id: 'left' };
        const right = { id: 'right' };
        const leftFooter = registry.getOrCreate(left, () => new FakeFooter());
        const rightFooter = registry.getOrCreate(right, () => new FakeFooter());

        registry.remove(left);

        expect(leftFooter.removed).toBe(true);
        expect(rightFooter.removed).toBe(false);
        expect(registry.size).toBe(1);
    });

    it('removes every mounted footer when the feature is disabled or unloaded', () => {
        const registry = new FooterRegistry<View, FakeFooter>();
        const first = registry.getOrCreate({ id: 'first' }, () => new FakeFooter());
        const second = registry.getOrCreate({ id: 'second' }, () => new FakeFooter());

        registry.removeAll();

        expect(first.removed).toBe(true);
        expect(second.removed).toBe(true);
        expect(registry.size).toBe(0);
    });
});
