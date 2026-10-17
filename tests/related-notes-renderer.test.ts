import { describe, expect, it, vi } from 'vitest';
import { RelatedNotesRenderer } from '../src/RelatedNotesRenderer';
import { DEFAULT_SETTINGS } from '../src/Settings';

// Minimal Obsidian element API; no real vault, DOM, or file reads.
class Element {
    children: Element[] = [];
    style = {};
    innerHTML = '';
    title = '';
    onclick?: () => void;
    constructor(public cls = '', public text = '') {}
    empty() { this.children = []; }
    createDiv(options: { cls?: string; text?: string }) { return this.createEl('div', options); }
    createEl(_tag: string, options: { cls?: string; text?: string; title?: string }) {
        const child = new Element(options.cls, options.text);
        this.children.push(child);
        return child;
    }
    setAttribute() {}
    addEventListener() {}
    find(cls: string): Element[] {
        return this.children.flatMap(child => [
            ...(child.cls === cls ? [child] : []), ...child.find(cls)
        ]);
    }
}

function render(candidateCount: number) {
    const plugin = {
        settings: { ...DEFAULT_SETTINGS, showContext: false, replaceNativeBacklinks: true,
            showBacklinks: true, showOutgoingLinks: true },
        app: { metadataCache: { resolvedLinks: {
            'Source.md': { 'Outgoing.md': 1 },
            'Incoming.md': { 'Source.md': 1 }
        } } }
    };
    const renderer = new RelatedNotesRenderer(plugin as any);
    renderer.scoringService.strategies = [{ calculate: () => Array.from(
        { length: candidateCount }, (_, i) => ({ path: `Candidate${i}.md`, score: 1, reason: 'graph' })
    ) }];
    const container = new Element();
    renderer.render({ container: container as any, sourcePath: 'Source.md',
        viewContext: {} as any, hoverSource: 'test', emptyText: 'None', onRerender: vi.fn() });
    return container;
}

function names(container: Element) {
    return container.find('internal-link').map(el => el.text);
}

describe('related notes display limit', () => {
    it('provides access to direct links below the first 20 results when replacing backlinks', () => {
        const container = render(21);
        expect(names(container)).toHaveLength(20);
        expect(names(container)).not.toContain('Incoming');
        const expand = container.find('atomic-insights-show-all');
        expect(expand).toHaveLength(1);
        expand[0].onclick!();
        expect(names(container)).toHaveLength(23);
        expect(names(container)).toContain('Incoming');
        expect(names(container)).toContain('Outgoing');
        expect(new Set(names(container)).size).toBe(23);
        expect(container.find('atomic-insights-show-all')).toHaveLength(0);
    });

    it('does not add an expansion control when all results already fit', () => {
        const container = render(18);
        expect(names(container)).toHaveLength(20);
        expect(names(container)).toContain('Incoming');
        expect(container.find('atomic-insights-show-all')).toHaveLength(0);
    });
});
