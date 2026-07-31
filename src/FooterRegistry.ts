/**
 * Owns footer nodes by MarkdownView identity.
 *
 * A note can be open in more than one leaf, so a single global "current"
 * footer cannot model the UI safely.
 */
export class FooterRegistry<View extends object, Footer extends { remove(): void }> {
    private readonly footers = new Map<View, Footer>();

    get size(): number {
        return this.footers.size;
    }

    get(view: View): Footer | undefined {
        return this.footers.get(view);
    }

    getOrCreate(view: View, create: () => Footer): Footer {
        const existing = this.footers.get(view);
        if (existing) return existing;

        const footer = create();
        this.footers.set(view, footer);
        return footer;
    }

    remove(view: View): void {
        const footer = this.footers.get(view);
        if (!footer) return;

        footer.remove();
        this.footers.delete(view);
    }

    removeAll(): void {
        this.footers.forEach(footer => footer.remove());
        this.footers.clear();
    }

    entries(): IterableIterator<[View, Footer]> {
        return this.footers.entries();
    }
}
