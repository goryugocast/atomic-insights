# Atomic Insights — Scoring Specification

This document describes how Atomic Insights computes the related-notes list for the active note, and how each scoring strategy interprets the **Excluded Folders** setting.

## Pipeline overview

For a given source note `S`, the plugin runs every enabled scoring strategy independently, weights each result, sums them per target path, and sorts descending.

```
strategies = [Graph, Metadata, Time, EditTime]
for strategy in strategies:
    results = strategy.calculate(S)        # per-strategy list of {path, score, reason}
    for r in results:
        aggregated[r.path] += r.score * weight(r.reason)

# Direct links (backlinks / outgoing) are added with score 0 if not already scored,
# so explicit user-made links always appear in the panel.
```

The final list is `aggregated` sorted by score (descending), with ties broken by path.

## Scoring strategies

### 1. Graph (Adamic-Adar)

- Builds an undirected graph from the vault's resolved links.
- For each candidate target `T`, sums `1 / log(degree(w))` over common neighbors `w` of `S` and `T`.
- Common neighbors with degree 1 contribute nothing.
- High-degree hubs (e.g. MOCs) contribute less than rare shared neighbors.

### 2. Metadata (virtual-graph Adamic-Adar)

- Treats each `(yaml-key, value)` pair and each filename emoji as a **virtual node**.
- A note is connected to every virtual node it carries.
- Computes Adamic-Adar on this virtual graph.
- Captures category-style co-occurrence (`project: ks`, `tags: [...]`, `🏔️` prefix, etc).
- Match is **exact-string**. There is no semantic similarity here.

### 3. Time (filename-date proximity)

- Parses a date from the source filename (e.g. `2026-04-29`).
- For each candidate target whose filename also parses to a date, computes exponential decay over the difference in days.
- Half-life is configurable (default: 28 days). At the half-life, score = 0.5.
- Scores below 0.01 are discarded.

### 4. Edit Time (mtime co-occurrence — daily notes only)

- Activates **only when the source note is inside the Daily Notes folder** (auto-detected from Obsidian's `daily-notes` core plugin).
- For every other markdown file, computes exponential decay over `|sourceMtime − targetMtime|`.
- Half-life is configurable in **hours** (default: 24h). At 24h: 0.5; at 48h: 0.25; at 72h: ≈0.125.
- Scores below 0.01 are discarded.
- Designed to surface *"what else did I touch around this day?"* — typically the concept notes and project notes you edited near the daily.

## Excluded Folders — per-strategy semantics

The **Excluded Folders** setting is intentionally **per-strategy**, not a global blacklist. "Excluding" a folder means the listed paths do not contribute to a strategy where they would otherwise distort the result. Each strategy decides whether the exclusion applies to its own logic.

| Strategy | Excluded Folders applied? | Why |
|---|---|---|
| Graph (AA) | **Yes** | Hub-like notes (dailies, routines) inflate the graph and pollute concept-to-concept relations. They are removed before degree calculation. |
| Metadata | No | Tag/category co-occurrence is independent of folder placement. Excluding here would silently weaken legitimate `project:`/`tags:` overlap. |
| Time (filename-date) | No | Date-proximity between dated notes is the entire point. Excluding the daily folder would suppress *adjacent dailies*, which is usually what you want to see. |
| Edit Time | **Yes** | When viewing a daily, mtime-proximity tends to surface tasks/routines edited around the same time. Removing them keeps only meaningful co-edits (concept notes, project work). |
| Direct links (backlinks / outgoing) | No | These are explicit `[[]]` connections written by the user. They are honored regardless of folder. |

This design follows the principle that "excluded" should mean *"this folder does not participate in this specific calculation,"* not *"this folder never appears anywhere in the result."*

## Direct-link inclusion

If `Show Backlinks` or `Show Outgoing Links` is enabled, the plugin adds any explicit `[[]]` neighbor of `S` to the result list with score `0` if it is not already scored. This guarantees that a note you have explicitly linked is never hidden, regardless of how the scoring strategies ranked it.

## Daily folder detection

The Edit Time strategy reads the daily folder from Obsidian's built-in `daily-notes` core plugin (`internalPlugins.plugins["daily-notes"].instance.options.folder`). If the core plugin is disabled or the folder is not configured, Edit Time produces no results.

This means Edit Time works with zero additional configuration if you are already using Obsidian's standard daily notes feature.
