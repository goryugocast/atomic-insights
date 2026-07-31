import { describe, expect, it } from 'vitest';
import { RenderGeneration } from '../src/RenderGeneration';

describe('RenderGeneration', () => {
    it('invalidates older work for the same footer only', () => {
        const generations = new RenderGeneration<object>();
        const left = {};
        const right = {};
        const firstLeft = generations.next(left);
        const rightGeneration = generations.next(right);
        const secondLeft = generations.next(left);

        expect(generations.isCurrent(left, firstLeft)).toBe(false);
        expect(generations.isCurrent(left, secondLeft)).toBe(true);
        expect(generations.isCurrent(right, rightGeneration)).toBe(true);
    });
});
