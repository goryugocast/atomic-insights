/** Tracks asynchronous work separately for each rendered footer. */
export class RenderGeneration<Container extends object> {
    private readonly generations = new WeakMap<Container, number>();

    next(container: Container): number {
        const generation = (this.generations.get(container) ?? 0) + 1;
        this.generations.set(container, generation);
        return generation;
    }

    isCurrent(container: Container, generation: number): boolean {
        return this.generations.get(container) === generation;
    }
}
