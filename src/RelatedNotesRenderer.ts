import { ItemView, MarkdownView, setIcon } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { HybridScoringService } from './scoring/HybridScoringService';

type RenderOptions = {
    container: HTMLElement;
    sourcePath: string;
    viewContext: MarkdownView | ItemView;
    hoverSource: string;
    emptyText: string;
    onRerender: () => void;
};

export class RelatedNotesRenderer {
    plugin: AtomicInsightsPlugin;
    scoringService: HybridScoringService;
    renderToken = 0;

    constructor(plugin: AtomicInsightsPlugin) {
        this.plugin = plugin;
        this.scoringService = new HybridScoringService(plugin.app, plugin.settings);
    }

    render(options: RenderOptions) {
        this.renderToken += 1;
        const token = this.renderToken;
        const { container, sourcePath, viewContext, hoverSource, emptyText, onRerender } = options;

        container.empty();

        // Ensure settings are fresh
        this.scoringService.settings = this.plugin.settings;
        const results = this.scoringService.calculate(sourcePath);

        // Header
        const headerContainer = container.createDiv({ cls: 'atomic-insights-header-container' });
        headerContainer.createEl('h6', { text: 'Atomic Insights', cls: 'atomic-insights-header' });

        // Controls
        const controls = headerContainer.createDiv({ cls: 'atomic-insights-controls' });

        // Context Toggle Button
        const contextBtn = controls.createEl('button', {
            cls: 'atomic-insights-control-btn' + (this.plugin.settings.showContext ? ' is-active' : ''),
            title: this.plugin.settings.showContext ? 'Hide Context' : 'Show Context'
        });
        setIcon(contextBtn, 'chevrons-up-down');

        contextBtn.onclick = async () => {
            this.plugin.settings.showContext = !this.plugin.settings.showContext;
            await this.plugin.saveSettings();
            onRerender();
        };

        // Folder Toggle Button
        const folderBtn = controls.createEl('button', {
            cls: 'atomic-insights-control-btn' + (this.plugin.settings.showFolderNames ? ' is-active' : ''),
            title: this.plugin.settings.showFolderNames ? 'Hide Folder Names' : 'Show Folder Names'
        });

        const folderIcon = this.plugin.settings.showFolderNames ? 'folder-tree' : 'folder';
        setIcon(folderBtn, folderIcon);

        folderBtn.onclick = async () => {
            this.plugin.settings.showFolderNames = !this.plugin.settings.showFolderNames;
            await this.plugin.saveSettings();
            onRerender();
        };

        // List
        const listContainer = container.createDiv({ cls: 'atomic-insights-list' });

        if (results.length === 0) {
            listContainer.createDiv({ cls: 'atomic-insights-empty', text: emptyText });
            return;
        }

        // Show top 20 (Reduced from 50 for performance with context expansion)
        const topResults = results.slice(0, 20);

        topResults.forEach((res: { path: string; score: number; reasons?: string[]; details?: Record<string, unknown> }) => {
            const item = listContainer.createDiv({ cls: 'atomic-insights-item' });

            const displayName = this.plugin.settings.showFolderNames
                ? res.path.replace('.md', '')
                : res.path.split('/').pop()?.replace('.md', '') ?? res.path;

            // --- Calculate Icon / Direction ---
            const resolvedLinks = this.plugin.app.metadataCache.resolvedLinks;
            const outgoing = resolvedLinks[sourcePath]?.[res.path] !== undefined;
            const incoming = resolvedLinks[res.path]?.[sourcePath] !== undefined;

            let iconName: string | null = null;
            let title = '';

            if (outgoing && incoming) {
                iconName = 'arrow-right-left';
                title = 'Bidirectional link';
            } else if (outgoing) {
                iconName = 'arrow-right';
                title = 'Outgoing link';
            } else if (incoming) {
                iconName = 'arrow-left';
                title = 'Backlink';
            }

            // 1. Icon Container (Left)
            const iconContainer = item.createDiv({ cls: 'atomic-insights-icon-container' });
            if (iconName) {
                iconContainer.title = title;
                setIcon(iconContainer, iconName);
                if (iconContainer.innerHTML === '' && iconName === 'arrow-right-left') {
                    setIcon(iconContainer, 'switch');
                    if (iconContainer.innerHTML === '') setIcon(iconContainer, 'arrow-up-down');
                }
            }

            // 2. Content Container (Right: Header + Preview)
            const contentContainer = item.createDiv({ cls: 'atomic-insights-content-container' });

            // A. Item Header (Name + Bar) - Click to Open Note
            const itemHeader = contentContainer.createDiv({ cls: 'atomic-insights-item-header' });

            itemHeader.addEventListener('click', (e) => {
                e.preventDefault();
                if (e.metaKey || e.ctrlKey) {
                    const leaf = this.plugin.app.workspace.getLeaf('tab');
                    const targetFile = this.plugin.app.vault.getFileByPath(res.path);
                    if (targetFile) void leaf.openFile(targetFile);
                } else {
                    void this.plugin.app.workspace.openLinkText(res.path, sourcePath);
                }
            });

            // Name
            const nameEl = itemHeader.createDiv({ cls: 'atomic-insights-item-name' });
            nameEl.createEl('span', {
                cls: 'internal-link',
                text: displayName
            });

            // Score Bar
            const scorePercent = Math.min(100, Math.round(res.score * 10));
            const barContainer = itemHeader.createDiv({ cls: 'atomic-insights-item-bar-container' });
            const bar = barContainer.createDiv({ cls: 'atomic-insights-item-bar' });
            bar.style.width = `${scorePercent}%`;
            bar.title = `Score: ${res.score.toFixed(2)}`;

            // Context Preview (Async Rendering)
            if (this.plugin.settings.showContext) {
                const previewContainer = contentContainer.createDiv({ cls: 'atomic-insights-preview-container' });
                setTimeout(async () => {
                    if (token !== this.renderToken) return;
                    try {
                        const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(res.path, sourcePath);
                        if (!targetFile) return;

                        const content = await this.plugin.app.vault.cachedRead(targetFile);
                        if (token !== this.renderToken) return;
                        const lines = content.split('\n');

                        let textToShow = '';
                        let linkLineIndex = -1;

                        // Use MetadataCache to find link position
                        const cache = this.plugin.app.metadataCache.getFileCache(targetFile);
                        if (cache?.links) {
                            for (const l of cache.links) {
                                const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(l.link, targetFile.path);
                                if (dest && dest.path === sourcePath) {
                                    linkLineIndex = l.position.start.line;
                                    break;
                                }
                            }
                        }

                        if (linkLineIndex !== -1) {
                            const targetLine = lines[linkLineIndex];
                            const targetIndent = targetLine.search(/\S|$/);
                            let extracted = [targetLine];

                            for (let i = linkLineIndex + 1; i < lines.length; i++) {
                                const nextLine = lines[i];
                                if (nextLine.trim() === '') continue;

                                const nextIndent = nextLine.search(/\S|$/);
                                if (nextIndent > targetIndent) {
                                    extracted.push(nextLine);
                                } else {
                                    break;
                                }
                                if (extracted.length > 5) break;
                            }

                            // Normalize Indentation
                            let minIndent = Infinity;
                            extracted.forEach(line => {
                                if (line.trim().length > 0) {
                                    const match = line.match(/^(\s*)/);
                                    const indent = match ? match[1].length : 0;
                                    if (indent < minIndent) minIndent = indent;
                                }
                            });
                            if (minIndent !== Infinity && minIndent > 0) {
                                extracted = extracted.map(line => {
                                    if (line.length >= minIndent) {
                                        return line.substring(minIndent);
                                    }
                                    return line;
                                });
                            }

                            textToShow = extracted.join('\n');
                        } else {
                            // No backlink found -> Show Header/Intro
                            let startLine = 0;
                            if (lines[0]?.trim() === '---') {
                                for (let i = 1; i < lines.length; i++) {
                                    if (lines[i].trim() === '---') {
                                        startLine = i + 1;
                                        break;
                                    }
                                }
                            }

                            let extracted = [];
                            for (let i = startLine; i < lines.length; i++) {
                                const line = lines[i];
                                if (line.trim() !== '') {
                                    extracted.push(line);
                                }
                                if (extracted.length >= 2) break;
                            }
                            textToShow = extracted.join('\n');
                        }

                        if (textToShow) {
                            if (token !== this.renderToken) return;
                            void import('obsidian').then(({ MarkdownRenderer }) => {
                                if (token !== this.renderToken) return;
                                void MarkdownRenderer.render(
                                    this.plugin.app,
                                    textToShow,
                                    previewContainer,
                                    targetFile.path,
                                    viewContext
                                );
                            });

                            previewContainer.addClass('is-clickable');
                            previewContainer.addEventListener('click', async (e) => {
                                e.stopPropagation();
                                e.preventDefault();

                                if (e.metaKey || e.ctrlKey) {
                                    const leaf = this.plugin.app.workspace.getLeaf('tab');
                                    await leaf.openFile(this.plugin.app.vault.getFileByPath(res.path));
                                    return;
                                }

                                await this.plugin.app.workspace.openLinkText(res.path, sourcePath);

                                if (linkLineIndex !== -1) {
                                    setTimeout(() => {
                                        const activeLeaf = this.plugin.app.workspace.getMostRecentLeaf();
                                        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
                                            const editor = activeLeaf.view.editor;
                                            editor.setCursor({ line: linkLineIndex, ch: 0 });
                                            editor.scrollIntoView({ from: { line: linkLineIndex, ch: 0 }, to: { line: linkLineIndex, ch: 0 } }, true);
                                        }
                                    }, 100);
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Atomic Insights: Failed to load context', e);
                    }
                }, 0);
            }

            // Drag & Drop (on item)
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', (e) => {
                if (e.dataTransfer) {
                    const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(res.path, sourcePath);
                    if (targetFile) {
                        const linkText = this.plugin.app.fileManager.generateMarkdownLink(targetFile, sourcePath);
                        e.dataTransfer.setData('text/plain', linkText);
                        e.dataTransfer.effectAllowed = 'copy';
                    }
                }
            });

            // Hover Preview (on item)
            item.addEventListener('mouseover', (event) => {
                this.plugin.app.workspace.trigger('hover-link', {
                    event,
                    source: hoverSource,
                    hoverParent: viewContext,
                    targetEl: item,
                    linktext: res.path,
                    sourcePath
                });
            });
        });
    }
}
