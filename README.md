# Adamic Adar Graph

A lightweight intellectual backup tool for those who grow their thinking through links.

This plugin is designed for practitioners of "Evergreen Notes" (inspired by Andy Matuschak) and "Atomic Notes" in Obsidian. It helps you rediscover hidden connections between your notes as your knowledge base grows.

## Concept
Beyond simple keyword matching or shared tags, this plugin uses the **Adamic Adar index** to unearth deep relationships within your Obsidian graph structure.

### Why Adamic Adar?
If two notes share a link to a "famous" note that everyone links to, the connection might be coincidental. However, **what if they share a link to a "niche" note that only a few others point to?** That suggests a much stronger, more meaningful alignment of thought.

The Adamic Adar algorithm assigns higher weight to these rare, specific shared connections. The more care you put into building your personal knowledge base, the better it becomes at facilitating unexpected reunions between notes based on your unique thinking patterns—something generic AI often misses.

## Features
- **Specific Algorithm**: Purely focused on the Adamic Adar index for optimal thought resonance.
- **Folder Exclusion**: Ignore specific folders like Templates, Archives, or Daily Notes.
- **Fast, Light, & Stable**: Rewritten from scratch to eliminate heavy dependencies and ensure stability.
- **Native Experience**: Stable sidebar view, click-to-navigate, and drag-and-drop support for link creation.

## Usage
1. Open the command palette and run `Open Graph Analysis View`.
2. The view in the sidebar will update automatically based on your active note.
3. Click an item to navigate, or drag an item into the editor to create a `[[Wikilink]]`.
4. Add folder paths (one per line) in the Settings to exclude them from calculations.

## Credits & Inspiration
This plugin is a complete rewrite of the original [Graph Analysis](https://github.com/SkepticMystic/graph-analysis) plugin by @SkepticMystic. While the implementation is entirely new and focuses solely on the Adamic Adar algorithm, the core concept and inspiration came from their wonderful work.

## License
MIT
