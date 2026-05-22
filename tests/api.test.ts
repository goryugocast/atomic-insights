import { describe, expect, it, vi } from 'vitest';
import { AtomicInsightsAPI } from '../src/API';

vi.mock('../src/scoring/HybridScoringService', () => {
    return {
        HybridScoringService: class {
            calculate(path: string) {
                return [
                    { path: `${path}::a`, score: 2, reasons: ['graph'] },
                    { path: `${path}::b`, score: 1, reasons: ['time'] }
                ];
            }
            async calculateAsync(path: string) {
                return this.calculate(path);
            }
        }
    };
});

describe('AtomicInsightsAPI', () => {
    it('returns an error when the target file does not exist', async () => {
        const plugin = {
            app: {
                vault: {
                    getFileByPath: () => null
                },
                workspace: {
                    getActiveViewOfType: () => null
                }
            },
            settings: {
                weightGraph: 1.5
            }
        } as any;

        const api = new AtomicInsightsAPI(plugin);
        const result = await api.getRelatedNotes('Missing.md');

        expect(result).toEqual({
            status: 'error',
            message: 'File not found: Missing.md'
        });
    });

    it('limits results and includes metadata for a successful lookup', async () => {
        const plugin = {
            app: {
                vault: {
                    getFileByPath: () => ({ path: 'Inbox/Test.md' })
                },
                workspace: {
                    getActiveViewOfType: () => null
                }
            },
            settings: {
                weightGraph: 1.5
            }
        } as any;

        const api = new AtomicInsightsAPI(plugin);
        const result = await api.getRelatedNotes('Inbox/Test.md', { limit: 1 });

        expect(result.status).toBe('success');
        if (result.status === 'success') {
            expect(result.source).toBe('Inbox/Test.md');
            expect(result.parameters.limit).toBe(1);
            expect(result.parameters.appliedWeights.graph).toBe(1.5);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].path).toBe('Inbox/Test.md::a');
        }
    });

    it('returns an error when there is no active markdown note', async () => {
        const plugin = {
            app: {
                vault: {
                    getFileByPath: () => null
                },
                workspace: {
                    getActiveViewOfType: () => null
                }
            },
            settings: {
                weightGraph: 1
            }
        } as any;

        const api = new AtomicInsightsAPI(plugin);
        const result = await api.getActiveRelatedNotes();

        expect(result).toEqual({
            status: 'error',
            message: 'No active markdown file found.'
        });
    });
});
