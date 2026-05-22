import { App } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';

export interface ScoringResult {
    path: string;
    score: number;
    // Optional details for debugging or UI indicators
    reason?: string;
    details?: {
        commonNeighbors?: string[];
    };
}

export interface IScoringStrategy {
    calculate(sourcePath: string): ScoringResult[];
    calculateAsync?(sourcePath: string): Promise<ScoringResult[]>;
}

/**
 * Yield control back to the event loop.
 * Insert this in heavy synchronous loops to prevent UI thread blocking
 * (critical for CDP/CLI callers that can't receive responses while blocked).
 */
export function yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}
