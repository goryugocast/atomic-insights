import { describe, expect, it } from 'vitest';
import { parseDateFromPath } from '../src/scoring/timeParsing';
import { buildExclusionFilter } from '../src/scoring/exclusions';
import { computeOtherRatios } from '../src/scoring/weights';
import { DEFAULT_SETTINGS } from '../src/Settings';

describe('timeParsing', () => {
    it('parses YYYY-MM-DD before YYMMDD', () => {
        const date = parseDateFromPath('2024-01-15.md');
        expect(date).not.toBeNull();
        expect(date?.getFullYear()).toBe(2024);
        expect(date?.getMonth()).toBe(0);
        expect(date?.getDate()).toBe(15);
    });

    it('parses YYMMDD in ks.* filenames', () => {
        const date = parseDateFromPath('ks.240115_Title.md');
        expect(date).not.toBeNull();
        expect(date?.getFullYear()).toBe(2024);
        expect(date?.getMonth()).toBe(0);
        expect(date?.getDate()).toBe(15);
    });
});

describe('exclusions', () => {
    it('matches excluded folder prefixes', () => {
        const isExcluded = buildExclusionFilter({
            ...DEFAULT_SETTINGS,
            excludedFolders: 'Inbox\nArchive/'
        });
        expect(isExcluded('Inbox/Note.md')).toBe(true);
        expect(isExcluded('Archive/Old.md')).toBe(true);
        expect(isExcluded('Notes/Ok.md')).toBe(false);
    });
});

describe('other weight ratios', () => {
    it('ignores emoji/yaml when metadata is disabled', () => {
        const ratios = computeOtherRatios({
            ...DEFAULT_SETTINGS,
            enableMetadataScore: false,
            enableTimeScore: true,
            weightOther: 2,
            weightTime: 3,
            weightEmoji: 10,
            weightYaml: 10
        });
        expect(ratios.total).toBe(2);
        expect(ratios.emoji).toBe(0);
        expect(ratios.yaml).toBe(0);
        expect(ratios.time).toBe(2);
    });
});
