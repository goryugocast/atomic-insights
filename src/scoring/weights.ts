import { AtomicInsightsSettings } from '../Settings';

export type OtherWeightRatios = {
    total: number;
    emoji: number;
    yaml: number;
    time: number;
};

export function computeOtherRatios(settings: AtomicInsightsSettings): OtherWeightRatios {
    const metadataEnabled = settings.enableMetadataScore;
    const emojiWeight = metadataEnabled && settings.enableEmojiScore ? settings.weightEmoji : 0;
    const yamlWeight = metadataEnabled && settings.enableYamlScore ? settings.weightYaml : 0;
    const timeWeight = settings.enableTimeScore ? settings.weightTime : 0;
    const sum = emojiWeight + yamlWeight + timeWeight;

    if (sum <= 0) {
        return { total: 0, emoji: 0, yaml: 0, time: 0 };
    }

    return {
        total: settings.weightOther,
        emoji: settings.weightOther * (emojiWeight / sum),
        yaml: settings.weightOther * (yamlWeight / sum),
        time: settings.weightOther * (timeWeight / sum)
    };
}
