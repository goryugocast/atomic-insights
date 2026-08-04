# Atomic Insights

Discover structurally related notes through your personal link graph — and let AI agents use the same data to organize your vault.

## How it works

This plugin analyzes the link structure within your vault using the Adamic Adar index and combines it with optional context signals (metadata and time) to surface highly relevant notes.

### Why Adamic Adar?

If two notes share a link to a "common" page that is linked to by many other notes, that connection might be coincidental. However, if they share a link to a "niche" page that is only pointed to by a few others, it suggests a much stronger and more specific alignment of thought.

The Adamic Adar algorithm assigns higher value to these "unique shared connections."

In practice, this means: a daily note that links to dozens of pages is a weak signal — many notes pass through it, so sharing that connection is almost meaningless. But a carefully written atomic note that links to only a handful of specific ideas is a strong signal. When two notes both connect through that kind of focused intermediary, Adamic Adar scores it highly.

This is why the plugin is called Atomic Insights — the insights emerge from atomic notes. The more you build your vault in the style of small, focused notes connected by intentional links, the sharper the results become.

### What AI cannot see on its own

LLMs are good at finding semantically similar text — notes that use similar words. But they have no way to know that two notes in your vault are connected through a niche intermediary that only three other notes link to. That structural signal lives exclusively in your link graph, and this plugin makes it accessible.

## AI integration

Atomic Insights exposes a public plugin API that returns structured JSON (path, score, reasons, common neighbors). From the Obsidian CLI, get it through `app.plugins.getPlugin("atomic-insights").api`; this is more reliable than the compatibility global `window.AtomicInsights`. Combined with the [Obsidian CLI](https://obsidian.md/blog/introducing-obsidian-cli/), AI coding agents can query your knowledge graph from the terminal and act on the results.

### What this enables

An AI agent can:

- Retrieve related notes for any file in your vault, scored and ranked.
- Discover connections you haven't explicitly made — surfaced by the graph, not by keyword overlap.
- Use the structured output (scores, reasons, common neighbors) to decide what to link, where to file a note, or which notes to consolidate.

Use keyword search first for known terms, duplicates, and a named subject. Then use Atomic Insights to surface structurally adjacent notes that those terms do not retrieve. A result is a reading candidate, not an automatic edit: read the note and its common neighbors, and state the connection it would add before linking it.

### Example use cases

- Suggest notes to link from a daily note or index page, based on graph proximity rather than keyword overlap.
- Find notes that are structurally close but not yet linked — candidates for consolidation or cross-referencing.
- Build or maintain index pages (Maps of Content) by querying the graph around a topic and discovering what belongs together.

### Quick example

```bash
# Verify the API is available
obsidian eval code='typeof app.plugins.getPlugin("atomic-insights")?.api'

# Get top 5 related notes for a specific file
obsidian eval code='JSON.stringify(app.plugins.getPlugin("atomic-insights").api.getRelatedNotesSync("Path/To/Note.md", { limit: 5 }), null, 2)'
```

For the full CLI reference (sync vs async, shell scripts, error handling), see [docs/OBSIDIAN_CLI.md](docs/OBSIDIAN_CLI.md).

## GUI features

The plugin also provides a visual interface for exploring related notes directly in Obsidian:

- Dedicated sidebar view and a footer view under the current note.
- Click to navigate, drag-and-drop to create `[[Wikilinks]]`.
- Native page previews (Cmd/Ctrl + Hover).
- Adjustable weights: Graph vs Other, plus per-signal tuning (emoji, YAML, time, edit time).
- Excluded Folders setting with per-strategy semantics (see [docs/SCORING.md](docs/SCORING.md)).

### Getting started

1. Run `Open Atomic Insights View` from the Command Palette.
2. The sidebar view updates automatically based on your active note.
3. Tune the weights in Settings to match your vault's structure.

## Growth of your knowledge base

This plugin relies on the accumulation of connections (links) between your notes. It becomes more effective as your knowledge base matures. In the early stages or in a vault with few links, you may not see significant results.

If the suggestions do not meet your expectations, continue the practice of "recording thoughts in atomic units and connecting them purposefully." As the density of your links increases, the precision of the algorithm improves.

## API reference

### Methods

| Method | Use from | Description |
|---|---|---|
| `getRelatedNotes(path, options)` | In-app (plugins, DataviewJS) | Returns ranked related notes. Async — yields to the event loop to keep the UI responsive. |
| `getRelatedNotesSync(path, options)` | CLI (`obsidian eval`) | Same result, synchronous. Required for CLI because `eval` cannot await cross-tick Promises. |
| `getActiveRelatedNotes(options)` | In-app | Related notes for the currently active markdown note. |
| `getActiveRelatedNotesSync(options)` | CLI | Synchronous variant. Requires an active markdown note in the workspace. |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 20 | Maximum number of results to return. |

### Response shape

```json
{
  "status": "success",
  "results": [
    {
      "path": "Brain/Permanent/Note.md",
      "score": 3.85,
      "reasons": ["graph", "time"],
      "details": {
        "commonNeighbors": ["Brain/MOC/Topic.md", "Brain/Permanent/Other.md"]
      }
    }
  ]
}
```

On error:

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
