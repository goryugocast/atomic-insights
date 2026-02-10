export function parseDateFromPath(path: string): Date | null {
    // Filename formats:
    // 1. "ks.240115_Title.md" (YYMMDD)
    // 2. "2024-01-15.md" (YYYY-MM-DD)
    const basename = path.split('/').pop()?.replace('.md', '') || '';

    // Match YYYY-MM-DD (prefer explicit format to avoid mis-detection)
    const yyyymmddMatch = basename.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (yyyymmddMatch) {
        const year = parseInt(yyyymmddMatch[1]);
        const month = parseInt(yyyymmddMatch[2]) - 1;
        const day = parseInt(yyyymmddMatch[3]);
        return new Date(year, month, day);
    }

    // Match YYMMDD (after 'ks.' or at start)
    const yymmddMatch = basename.match(/(?:^|ks\.)(\d{2})(\d{2})(\d{2})(?:$|[^0-9])/);
    if (yymmddMatch) {
        const year = parseInt(yymmddMatch[1]) + 2000; // Assume 20xx
        const month = parseInt(yymmddMatch[2]) - 1;
        const day = parseInt(yymmddMatch[3]);
        return new Date(year, month, day);
    }

    return null;
}
