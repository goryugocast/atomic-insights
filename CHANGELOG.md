# Changelog

All notable changes to this project will be documented in this file.

## [0.4.2] - 2026-05-30
### Fixed
- **CLI API Returns Empty**: The async `getRelatedNotes`/`getActiveRelatedNotes` yield to the event loop via `setTimeout`, but the Obsidian CLI `eval` command cannot await a Promise that crosses an event-loop tick, so CLI calls returned empty. (Regression from 0.4.0 / `calculateAsync`.)

### Added
- **Synchronous API**: Added `getRelatedNotesSync(path, options)` and `getActiveRelatedNotesSync(options)` for CLI and script callers. They return the same response shape synchronously, so `obsidian eval` reliably receives results. The async variants remain for in-app use.

## [0.3.3] - 2026-03-27
### Added
- **API Documentation**: Documented the external `window.AtomicInsights` API in both English and Japanese READMEs, including usage examples and error behavior.
- **API Tests**: Added tests for missing-file handling, successful limited results, and the no-active-note case.

### Changed
- **API Typing**: Clarified external API response types to make runtime usage and future maintenance easier.

## [0.3.2] - 2026-03-27
### Added
- **External API**: Added `window.AtomicInsights` for external callers such as Obsidian CLI workflows and automation scripts.
- **Async Related Notes Access**: Added `getRelatedNotes(path, options)` and `getActiveRelatedNotes(options)` for programmatic access to ranked related-note results.

### Fixed
- **Missing File Handling**: `getRelatedNotes` now returns a structured error response when the target path does not exist instead of failing unexpectedly.

## [0.3.1] - 2026-02-11
### Fixed
- **Exclusion Semantics**: `Excluded Folders` now applies only to Graph (Adamic Adar) calculation. Metadata/Time/Direct-link related notes remain visible.
- **Excluded Source Notes**: Related notes are no longer empty when the active note itself is in an excluded folder.
- **Settings Clarity**: Moved `Excluded Folders` into `1. Graph Topology` and clarified the scope in UI and documentation.

## [0.3.0] - 2026-02-10
### Added
- **Hybrid Scoring**: Combined Graph (Adamic Adar) with context signals (Emoji, YAML, Time) using a weighted hybrid model.
- **Other Weight Model**: Added Graph vs Other weight plus per-signal ratios (Emoji/YAML/Time) for practical tuning.
- **Context-Aware Scoring**: New metadata and time strategies with exclusions applied consistently.
- **Renderer Unification**: Sidebar and footer now share a single renderer implementation.
- **Tests**: Added minimal unit tests for date parsing, exclusions, and weight ratios.

### Changed
- **Graph Scoring**: Handles incoming-only nodes to avoid empty related results.
- **Settings**: Expanded scoring configuration and added new controls for metadata and time.

## [0.2.7] - 2026-01-16
### Fixed
- **Sidebar Interaction**: Fixed an issue where the sidebar required a double-click to respond (by preventing self-triggered re-renders).
- **Layout Stability**: Completely refactored the sidebar/footer CSS to use Flexbox-based height synchronization (24px), eliminating fragile margin hacks that caused layout collapse.
- **Icon Visibility**: Fixed an issue where direction icons (arrows) would disappear due to missing color styles.
- **Empty State Styling**: Corrected the class name for the "No active file" message to ensure consistent styling.

## [0.2.6] - 2026-01-16
### Changed
- **UI Unification**: Fully unified the Footer UI with the Sidebar. Replaced text-based scores `(Score: 1.23)` with visual bar graphs.
- **Auto-Update**: Implemented robust auto-update logic using `metadataCache.on('changed')` with a 2000ms debounce.
- **List Logic**: Increased footer list limit to 50 items to ensure Direct Links (Score 0) are always visible.


## [0.2.5] - 2026-01-16
### Added
- **Link Direction Indicators**: Added icons to show link direction (Incoming `<-`, Outgoing `->`, Bidirectional `⇄`).
- **Related Notes Footer**: Integrated direct links (backlinks and outgoing links) into the related notes list (configurable in settings).
- **Settings**: Added toggles for 'Show Backlinks' and 'Show Outgoing Links'.

### Changed
- **UI & Layout**: Significantly refined the UI for both Sidebar and Footer views to match Obsidian's native "Linked mentions" style (padding, indentation, font size).
- **Icon Alignment**: Fixed layout issues where icons were misaligned or collapsed.
- **Direct Link Logic**: Updated scoring to include direct links with a base score.

## [0.2.3] - 2026-01-14

### Changed
- **UI Refinement**: Compacted header and list items to improve data density.
- **Alignment Fixes**: Aligned view header height and horizontal padding with Obsidian's native breadcrumbs and sidebars.
- **Icon Update**: Reduced icon size to 14px for better visual consistency.

## [0.2.0] - 2026-01-13

### Added
- **Folder Name Toggle**: Added a button to the view header to toggle between displaying full file paths and basenames.
- **Dynamic Icons**: Added visual distinction for the folder toggle using `folder` and `folder-tree` icons.
- **Active State Styling**: Improved UI feedback for the folder toggle using Obsidian's accent color.
- **Reliable Startup**: Added `active-leaf-change` event handling to ensure the analysis view populates correctly when Obsidian starts.

### Changed
- Refined the Adamic Adar calculation for better performance and accuracy.

## [0.1.0] - 2026-01-13

### Added
- **Initial Release**: Core functionality of "Atomic Insights" based on the Adamic Adar algorithm.
- **Graph Analysis View**: A dedicated sidebar view to list related notes.
- **Hover Preview**: Support for native Obsidian hover previews on listed items.
- **Folder Exclusion**: Setting to exclude specific folders from the analysis index.
- **Japanese Documentation**: Detailed `README_JA.md` for Japanese users.

---
[0.2.1]: https://github.com/goryugocast/atomic-insights/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/goryugocast/atomic-insights/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/goryugocast/atomic-insights/releases/tag/v0.1.0
