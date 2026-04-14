import { AtomicInsightsSettings } from '../Settings';

export function normalizeFolderRule(input: string): string {
    return input
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');
}

export function parseExcludedFolders(raw: string): string[] {
    return raw
        .split('\n')
        .map(normalizeFolderRule)
        .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index);
}

export function buildExclusionFilter(settings: AtomicInsightsSettings): (path: string) => boolean {
    const exclusionList = parseExcludedFolders(settings.excludedFolders);

    if (exclusionList.length === 0) {
        return () => false;
    }

    return (path: string) => {
        const normalizedPath = normalizeFolderRule(path);
        return exclusionList.some(folder => normalizedPath === folder || normalizedPath.startsWith(`${folder}/`));
    };
}
