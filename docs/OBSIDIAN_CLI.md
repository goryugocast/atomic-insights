# Atomic Insights with Obsidian CLI

This document shows concrete examples of calling Atomic Insights from the Obsidian CLI.

For CLI `eval`, obtain the plugin from Obsidian's plugin manager and call its
public API: `app.plugins.getPlugin("atomic-insights").api`. Do not use
`window.AtomicInsights` as the CLI integration point: it is only a compatibility
global and is not reliably present in every eval context.

## Prerequisites

- The plugin must be installed and enabled in your vault.
- Obsidian must be running with the target vault open.
- The plugin must already be loaded, so `app.plugins.getPlugin("atomic-insights")?.api` is available.

You can confirm the CLI command shape with:

```bash
obsidian help eval
```

## Important: use the `*Sync` methods from the CLI

The Obsidian CLI `eval` command can only return the result of code that resolves
**synchronously or within an immediate microtask**. It does **not** wait for a
Promise that crosses an event-loop tick (anything that goes through `setTimeout`,
I/O, etc.) — such calls return an empty result.

The async methods (`getRelatedNotes`, `getActiveRelatedNotes`) yield to the event
loop internally to avoid blocking the UI thread, so calling them from the CLI
returns empty. For the CLI, always use the synchronous variants below:

- `getRelatedNotesSync(path, options)`
- `getActiveRelatedNotesSync(options)`

They return the same response shape, just synchronously.

## Quick check

This verifies that the plugin API is available in the running app:

```bash
obsidian eval code='typeof app.plugins.getPlugin("atomic-insights")?.api'
```

Expected result:

```text
object
```

## Enable or recover the plugin

If the quick check is not `object`, enable the community plugin and then reload
it in the open vault before checking again:

```bash
obsidian plugin:enable id=atomic-insights filter=community
obsidian plugin:reload id=atomic-insights
obsidian eval code='JSON.stringify({enabled:app.plugins.enabledPlugins.has("atomic-insights"),api:typeof app.plugins.getPlugin("atomic-insights")?.api})'
```

The expected response is `{"enabled":true,"api":"object"}`. Do not fall back
to `window.AtomicInsights` when this fails: the plugin is unavailable to the CLI
until the plugin-manager API is present.

## Get related notes for the active note

```bash
obsidian eval code='JSON.stringify(app.plugins.getPlugin("atomic-insights").api.getActiveRelatedNotesSync({ limit: 5 }), null, 2)'
```

This is the fastest way to test the plugin from a script or terminal while you are looking at a note in Obsidian.

## Get related notes for a specific file

```bash
obsidian eval code='JSON.stringify(app.plugins.getPlugin("atomic-insights").api.getRelatedNotesSync("Inbox/My Note.md", { limit: 10 }), null, 2)'
```

Use the exact vault path, not a wikilink-style name.

## Return only note paths

```bash
obsidian eval code='(() => {
  const plugin = app.plugins.getPlugin("atomic-insights");
  if (!plugin?.api) return "ERROR: Atomic Insights plugin API is unavailable";
  const result = plugin.api.getRelatedNotesSync("Inbox/My Note.md", { limit: 10 });
  if (result.status !== "success") return result.message;
  return result.results.map((item) => item.path).join("\\n");
})()'
```

This is handy when you want shell-friendly output for piping into another tool.

## Return a compact TSV-style output

```bash
obsidian eval code='(() => {
  const plugin = app.plugins.getPlugin("atomic-insights");
  if (!plugin?.api) return "error\\tAtomic Insights plugin API is unavailable";
  const result = plugin.api.getRelatedNotesSync("Inbox/My Note.md", { limit: 10 });
  if (result.status !== "success") return "error\\t" + result.message;
  return result.results
    .map((item) => [item.path, item.score, (item.reasons || []).join(",")].join("\\t"))
    .join("\\n");
})()'
```

Example output:

```text
Projects/Atomic.md	2.31	graph,time
Notes/CLI.md	1.42	graph
Logs/2026-03-27.md	0.88	time
```

## Handle missing files safely

```bash
obsidian eval code='(() => {
  const plugin = app.plugins.getPlugin("atomic-insights");
  if (!plugin?.api) return "ERROR: Atomic Insights plugin API is unavailable";
  const result = plugin.api.getRelatedNotesSync("Inbox/Does Not Exist.md");
  if (result.status === "error") return "ERROR: " + result.message;
  return JSON.stringify(result.results, null, 2);
})()'
```

The API returns a structured error instead of throwing when the file is missing.

## Use from shell scripts

Example:

```bash
#!/usr/bin/env bash
set -euo pipefail

NOTE_PATH="${1:-Inbox/My Note.md}"

obsidian eval code="(() => {
  const plugin = app.plugins.getPlugin(\"atomic-insights\");
  if (!plugin?.api) return 'ERROR: Atomic Insights plugin API is unavailable';
  const result = plugin.api.getRelatedNotesSync(\"${NOTE_PATH}\", { limit: 5 });
  if (result.status !== 'success') return 'ERROR: ' + result.message;
  return result.results.map((item) => item.path).join('\n');
})()"
```

This pattern is useful for daily-note helpers, automation jobs, and quick terminal queries.

## Async methods (in-app use)

`getRelatedNotes(path, options)` and `getActiveRelatedNotes(options)` are the
Promise-returning versions. They yield to the event loop during heavy computation
to keep the UI responsive, which makes them suitable for in-app callers (plugins,
DataviewJS, etc.) but **not** for the CLI `eval` command. Prefer the `*Sync`
variants from the terminal.

## Notes

- The CLI command runs JavaScript inside the currently running Obsidian app.
- If `app.plugins.getPlugin("atomic-insights")?.api` is `undefined`, make sure the plugin is enabled and Obsidian has finished loading it.
- `getActiveRelatedNotesSync()` requires an active markdown note in the current workspace.
