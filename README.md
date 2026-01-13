# Adamic Adar Graph

A lightweight Obsidian plugin to discover related notes using the Adamic Adar index.

## Features
- **Smart Similarity**: Uses the Adamic Adar algorithm to find notes that share "meaningful" connections.
- **Folder Exclusion**: Ignore specific folders (like Templates or Archive) from calculations.
- **Fast & Interactive**: Simple list view in the sidebar with support for navigation and drag-and-drop linking.

## Usage
1. Open the **Adamic Adar Graph** view from the command palette.
2. The view will automatically update based on the currently active note.
3. Click on a result to open it.
4. Drag a result into your editor to create a link.

## Installation
(Coming soon to the Obsidian Community Plugins)

### Manual Installation
1. Downlaod `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Put them in your vault's plugin folder (e.g., `.obsidian/plugins/adamic-adar-graph/`).
3. Enable the plugin in Settings.

## Credits & Inspiration
This plugin is a complete rewrite of the original [Graph Analysis](https://github.com/SkepticMystic/graph-analysis) plugin by @SkepticMystic. While the implementation is entirely new and focuses solely on the Adamic Adar algorithm, the core concept was inspired by their work.

## License
MIT
