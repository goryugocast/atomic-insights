import { AtomicInsightsSettings } from '../Settings';

export function buildExclusionFilter(settings: AtomicInsightsSettings): (path: string) => boolean {
    const exclusionList = settings.excludedFolders
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (exclusionList.length === 0) {
        return () => false;
    }

    return (path: string) => exclusionList.some(folder => path.startsWith(folder));
}
