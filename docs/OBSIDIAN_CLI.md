# Atomic Insights with Obsidian CLI

This document shows concrete examples of calling the `window.AtomicInsights` API from the Obsidian CLI.

## Prerequisites

- The plugin must be installed and enabled in your vault.
- Obsidian must be running with the target vault open.
- The plugin must already be loaded, so `window.AtomicInsights` is available.

You can confirm the CLI command shape with:

```bash
obsidian help eval
```

## Quick check

This verifies that the plugin API is available in the running app:

```bash
obsidian eval code='typeof window.AtomicInsights'
```

Expected result:

```text
object
```

## Get related notes for the active note

```bash
obsidian eval code='(async () => {
  const result = await window.AtomicInsights.getActiveRelatedNotes({ limit: 5 });
  return JSON.stringify(result, null, 2);
})()'
```

This is the fastest way to test the plugin from a script or terminal while you are looking at a note in Obsidian.

## Get related notes for a specific file

```bash
obsidian eval code='(async () => {
  const result = await window.AtomicInsights.getRelatedNotes("Inbox/My Note.md", { limit: 10 });
  return JSON.stringify(result, null, 2);
})()'
```

Use the exact vault path, not a wikilink-style name.

## Return only note paths

```bash
obsidian eval code='(async () => {
  const result = await window.AtomicInsights.getRelatedNotes("Inbox/My Note.md", { limit: 10 });
  if (result.status !== "success") return result.message;
  return result.results.map((item) => item.path).join("\\n");
})()'
```

This is handy when you want shell-friendly output for piping into another tool.

## Return a compact TSV-style output

```bash
obsidian eval code='(async () => {
  const result = await window.AtomicInsights.getRelatedNotes("Inbox/My Note.md", { limit: 10 });
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
obsidian eval code='(async () => {
  const result = await window.AtomicInsights.getRelatedNotes("Inbox/Does Not Exist.md");
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

obsidian eval code="(async () => {
  const result = await window.AtomicInsights.getRelatedNotes(\"${NOTE_PATH}\", { limit: 5 });
  if (result.status !== 'success') return 'ERROR: ' + result.message;
  return result.results.map((item) => item.path).join('\n');
})()"
```

This pattern is useful for daily-note helpers, automation jobs, and quick terminal queries.

## Notes

- The CLI command runs JavaScript inside the currently running Obsidian app.
- If `window.AtomicInsights` is `undefined`, make sure the plugin is enabled and Obsidian has finished loading it.
- `getActiveRelatedNotes()` requires an active markdown note in the current workspace.
