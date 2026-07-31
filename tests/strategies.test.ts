import { describe, expect, it } from 'vitest';
import { GraphScoreStrategy } from '../src/scoring/GraphScoreStrategy';
import { MetadataScoreStrategy } from '../src/scoring/MetadataScoreStrategy';
import { TimeScoreStrategy } from '../src/scoring/TimeScoreStrategy';
import { DEFAULT_SETTINGS } from '../src/Settings';

describe('scoring strategies', () => {
    it('finds a graph candidate through a shared, low-degree neighbor', () => {
        const strategy = new GraphScoreStrategy({
            metadataCache: {
                resolvedLinks: {
                    'Source.md': { 'Shared.md': 1 },
                    'Candidate.md': { 'Shared.md': 1 }
                }
            }
        } as any, { ...DEFAULT_SETTINGS, enableGraphScore: true });

        expect(strategy.calculate('Source.md')).toEqual([{
            path: 'Candidate.md',
            score: 1 / Math.log(2),
            reason: 'graph',
            details: { commonNeighbors: ['Shared.md'] }
        }]);
    });

    it('scores exact YAML metadata co-occurrence', () => {
        const files = [
            { path: 'Source.md', basename: 'Source' },
            { path: 'Candidate.md', basename: 'Candidate' },
            { path: 'Other.md', basename: 'Other' }
        ];
        const strategy = new MetadataScoreStrategy({
            vault: { getMarkdownFiles: () => files },
            metadataCache: {
                getFileCache: (file: { path: string }) => ({
                    frontmatter: { project: file.path === 'Other.md' ? 'other' : 'atomic' }
                })
            }
        } as any, {
            ...DEFAULT_SETTINGS,
            enableMetadataScore: true,
            enableEmojiScore: false,
            enableYamlScore: true,
            metadataKeys: 'project'
        });

        expect(strategy.calculate('Source.md')).toEqual([{
            path: 'Candidate.md',
            score: 1 / Math.log(2),
            reason: 'yaml'
        }]);
    });

    it('uses the configured time half-life and ignores undated files', () => {
        const strategy = new TimeScoreStrategy({
            vault: {
                getMarkdownFiles: () => [
                    { path: '2026-01-01.md' },
                    { path: '2026-01-29.md' },
                    { path: 'Undated.md' }
                ]
            }
        } as any, { ...DEFAULT_SETTINGS, enableTimeScore: true, timeDecayDays: 28 });

        expect(strategy.calculate('2026-01-01.md')).toEqual([{
            path: '2026-01-29.md', score: 0.5, reason: 'time'
        }]);
    });
});
