# Changelog

All notable changes to this project will be documented in this file.

## [0.2.1] - 2026-01-14

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
