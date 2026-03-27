# Atomic Insights

A plugin to support the process of creating atomic notes and connecting them via links in Obsidian.

## Concept

This plugin analyzes the link structure within your vault using the Adamic Adar index and combines it with optional context signals (metadata and time) to suggest highly relevant notes. Its goal is to visualize objective connections based on your personal knowledge graph, rather than simple keyword matching.

### Why Adamic Adar?

If two notes share a link to a "common" page that is linked to by many other notes, that connection might be coincidental. However, if they share a link to a "niche" page that is only pointed to by a few others, it suggests a much stronger and more specific alignment of thought.

The Adamic Adar algorithm assigns higher value to these "unique shared connections." As you build a more refined personal knowledge base, the resulting insights will more accurately reflect your own unique thinking patterns.

### Growth of your Knowledge Base

This functionality relies on the accumulation of connections (links) between your notes. Therefore, it becomes more effective as your knowledge base matures. In the early stages or in a vault with few links, you may not see significant results.

If the suggestions do not meet your expectations, continue the practice of "recording thoughts in atomic units and connecting them purposefully." As the density of your links increases, the precision of the algorithm improves, allowing it to reveal objective connections that you might not have explicitly recognized.

## Features

- Suggests related notes using the Adamic Adar index.
- Optional context signals: filename emoji, YAML frontmatter, and date proximity.
- Adjustable weights: Graph vs Other, plus per-signal tuning inside Other.
- Ability to exclude specific folders from Graph (Adamic Adar) calculations.
- Dedicated sidebar view and a footer view under the current note.
- Supports native page previews (Cmd/Ctrl + Hover).
- Click to navigate and drag-and-drop to create wikilinks.

## Usage

1. Run `Open Atomic Insights View` from the Command Palette.
2. The view in the right sidebar will update automatically based on your active note.
3. Click an item to navigate, or drag an item into the editor to create a `[[Wikilink]]`.
4. In Settings, configure `Adamic Adar Score` and `Excluded Folders (Graph Only)` under `1. Graph Topology`.
5. Tune `Other (Non-Graph) Weight` and the internal ratios for Emoji/YAML/Time in Settings.

## External API

Atomic Insights also exposes a small runtime API on `window.AtomicInsights` after the plugin loads. This is useful for Obsidian CLI workflows, automation scripts, or debugging in the developer console.

### Available methods

- `getRelatedNotes(path, options)` returns ranked related notes for the specified file path.
- `getActiveRelatedNotes(options)` returns ranked related notes for the currently active markdown note.

### Options

- `limit` limits the number of returned results. Default: `20`

### Example

```js
const result = await window.AtomicInsights.getRelatedNotes(
  "Inbox/My Note.md",
  { limit: 10 }
);

if (result.status === "success") {
  console.table(result.results.map((item) => ({
    path: item.path,
    score: item.score,
    reasons: item.reasons?.join(", ") ?? ""
  })));
} else {
  console.error(result.message);
}
```

### Error handling

The API returns a structured error object when the target file does not exist or when there is no active markdown note:

```json
{
  "status": "error",
  "message": "File not found: Inbox/Missing Note.md"
}
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## Credits & Inspiration

This plugin is a complete rewrite of the original [Graph Analysis](https://github.com/SkepticMystic/graph-analysis) plugin by @SkepticMystic. While the implementation is entirely new and focused solely on the Adamic Adar algorithm, the core concept and workflow were inspired by their pioneering work.

## License

MIT
