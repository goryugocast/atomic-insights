import { describe, expect, it } from 'vitest';
import { HybridScoringService } from '../src/scoring/HybridScoringService';
import { DEFAULT_SETTINGS } from '../src/Settings';

describe('HybridScoringService', () => {
    it('adds direct backlinks and outgoing links even without a scoring strategy', () => {
        const service = createService({
            showBacklinks: true,
            showOutgoingLinks: true,
            enableGraphScore: false,
            enableMetadataScore: false,
            enableTimeScore: false,
            enableEditTimeScore: false
        }, {
            'Source.md': { 'Outgoing.md': 1 },
            'Incoming.md': { 'Source.md': 1 }
        });
        service.strategies = [];

        expect(service.calculate('Source.md')).toEqual([
            { path: 'Outgoing.md', score: 0, reasons: ['link'], details: {} },
            { path: 'Incoming.md', score: 0, reasons: ['link'], details: {} }
        ]);
    });

    it('combines strategy scores and does not duplicate an already scored direct link', () => {
        const service = createService({
            showBacklinks: true,
            showOutgoingLinks: true,
            weightGraph: 2,
            enableMetadataScore: false,
            enableTimeScore: false,
            enableEditTimeScore: false
        }, {
            'Source.md': { 'Linked.md': 1 },
            'Incoming.md': { 'Source.md': 1 }
        });
        service.strategies = [{
            calculate: () => [
                { path: 'Linked.md', score: 3, reason: 'graph' },
                { path: 'Candidate.md', score: 1, reason: 'graph' }
            ]
        }];

        expect(service.calculate('Source.md')).toEqual([
            { path: 'Linked.md', score: 6, reasons: ['graph'], details: {} },
            { path: 'Candidate.md', score: 2, reasons: ['graph'], details: {} },
            { path: 'Incoming.md', score: 0, reasons: ['link'], details: {} }
        ]);
    });
});

function createService(settings: Partial<typeof DEFAULT_SETTINGS>, resolvedLinks: Record<string, Record<string, number>>) {
    const app = { metadataCache: { resolvedLinks } } as any;
    return new HybridScoringService(app, { ...DEFAULT_SETTINGS, ...settings });
}
