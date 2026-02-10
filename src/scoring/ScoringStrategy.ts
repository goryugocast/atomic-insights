import { App } from 'obsidian';
import { AtomicInsightsSettings } from '../Settings';

export interface ScoringResult {
    path: string;
    score: number;
    // Optional details for debugging or UI indicators
    reason?: string;
}

export interface IScoringStrategy {
    calculate(sourcePath: string): ScoringResult[];
}
