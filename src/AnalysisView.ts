import { ItemView, WorkspaceLeaf, TFile, Notice, MarkdownView, setIcon } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { AdamicAdar, AnalysisResult } from './AdamicAdar';

export const VIEW_TYPE_ATOMIC_INSIGHTS = 'atomic-insights-view';

export class AtomicInsightsView extends ItemView {
    plugin: AtomicInsightsPlugin;
    adamicAdar: AdamicAdar;
    currentFilePath: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: AtomicInsightsPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.adamicAdar = new AdamicAdar(plugin.app, plugin.settings);
    }

    getViewType() {
        return VIEW_TYPE_ATOMIC_INSIGHTS;
    }

    getDisplayText() {
        return 'Atomic Insights';
    }

    getIcon() {
        return 'atomic-insights';
    }

    async onOpen() {
        this.update();
        // Register event for file switch
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (file) {
                this.update(file.path);
            }
        }));

        // Also listen to active-leaf-change to catch initial load or focus changes
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            if (leaf && leaf.view.getViewType() === VIEW_TYPE_ATOMIC_INSIGHTS) {
                return;
            }
            this.update();
        }));
    }

    async update(filePath?: string) {
        // Wait for layout to be ready to ensure active file can be retrieved
        if (!this.app.workspace.layoutReady) {
            this.app.workspace.onLayoutReady(() => this.update(filePath));
            return;
        }

        if (!filePath) {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                filePath = activeFile.path;
            } else {
                this.renderEmpty();
                return;
            }
        }

        this.currentFilePath = filePath;

        // Pass fresh settings in case they changed
        this.adamicAdar.settings = this.plugin.settings;

        const results = this.adamicAdar.calculate(filePath);
        this.render(results);
    }

    renderEmpty() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('div', { text: 'No active file selected.', cls: 'atomic-insights-empty' });
    }

    render(results: AnalysisResult[]) {
        const container = this.containerEl.children[1];
        container.empty();

        const dataContainer = container.createDiv({ cls: 'atomic-insights-list' }); // Use list class for container or specific container? 
        // RelatedNotesView puts list inside footer. Here "dataContainer" is the main scrollable area.
        // styles.css: .graph-analysis-container was used. existing .atomic-insights-list is flex col gap 4px.
        // We generally want a wrapper. Let's start with a generic container if needed, but atomic-insights-list acts as the list.
        // But we need the header first.

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
            this.render(results); // Re-render with same results
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
            this.render(results);
        };

        if (results.length === 0) {
            container.createDiv({ text: 'No results found.', cls: 'atomic-insights-empty' });
            return;
        }

        const list = container.createDiv({ cls: 'atomic-insights-list' });

        results.slice(0, 20).forEach(res => { // Limit to 20
            const item = list.createDiv({ cls: 'atomic-insights-item' });
            const itemFile = this.plugin.app.metadataCache.getFirstLinkpathDest(res.path, this.currentFilePath ?? '');

            // NOTE: dragstart/mouseover need 'file' (current active file) context?
            // this.currentFilePath is string. We usually need the objects for proper logic, 
            // but we can resolve using app.metadataCache if needed.
            // For dragging, we need the target file (res.path).

            const displayName = this.plugin.settings.showFolderNames
                ? res.path.replace('.md', '')
                : res.path.split('/').pop()?.replace('.md', '') ?? res.path;

            // --- Calculate Icon / Direction ---
            let iconName: string | null = null;
            let title = '';

            if (this.currentFilePath) {
                const resolvedLinks = this.app.metadataCache.resolvedLinks;
                const outgoing = resolvedLinks[this.currentFilePath]?.[res.path] !== undefined;
                const incoming = resolvedLinks[res.path]?.[this.currentFilePath] !== undefined;

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
            }

            // 1. Icon Container
            const iconContainer = item.createDiv({ cls: 'atomic-insights-icon-container' });
            if (iconName) {
                iconContainer.title = title;
                setIcon(iconContainer, iconName);
                if (iconContainer.innerHTML === '' && iconName === 'arrow-right-left') {
                    setIcon(iconContainer, 'switch');
                    if (iconContainer.innerHTML === '') setIcon(iconContainer, 'arrow-up-down');
                }
            }

            // 2. Content Container
            const contentContainer = item.createDiv({ cls: 'atomic-insights-content-container' });

            // A. Item Header (Name + Bar) - Click to Open
            const itemHeader = contentContainer.createDiv({ cls: 'atomic-insights-item-header' });

            itemHeader.addEventListener('click', (e) => {
                e.preventDefault();
                this.app.workspace.openLinkText(res.path, this.currentFilePath ?? '');
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

            // B. Context Preview
            if (this.plugin.settings.showContext && this.currentFilePath) {
                const previewContainer = contentContainer.createDiv({ cls: 'atomic-insights-preview-container' });

                setTimeout(async () => {
                    try {
                        const targetFile = this.app.metadataCache.getFirstLinkpathDest(res.path, this.currentFilePath ?? '');
                        if (!targetFile) return;

                        const content = await this.app.vault.cachedRead(targetFile);
                        const lines = content.split('\n');

                        let textToShow = '';
                        let linkLineIndex = -1;

                        const cache = this.app.metadataCache.getFileCache(targetFile);
                        if (cache?.links) {
                            for (const l of cache.links) {
                                const dest = this.app.metadataCache.getFirstLinkpathDest(l.link, targetFile.path);
                                if (dest && dest.path === this.currentFilePath) {
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
                                if (nextIndent > targetIndent) extracted.push(nextLine);
                                else break;
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
                                extracted = extracted.map(line => line.length >= minIndent ? line.substring(minIndent) : line);
                            }
                            textToShow = extracted.join('\n');

                        } else {
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
                                if (line.trim() !== '') extracted.push(line);
                                if (extracted.length >= 2) break;
                            }
                            textToShow = extracted.join('\n');
                        }

                        if (textToShow) {
                            import('obsidian').then(({ MarkdownRenderer }) => {
                                MarkdownRenderer.render(
                                    this.app,
                                    textToShow,
                                    previewContainer,
                                    targetFile.path,
                                    this // Component
                                );
                            });

                            previewContainer.addClass('is-clickable');
                            previewContainer.addEventListener('click', async (e) => {
                                e.stopPropagation();
                                e.preventDefault();

                                await this.app.workspace.openLinkText(res.path, this.currentFilePath ?? '');

                                if (linkLineIndex !== -1) {
                                    setTimeout(() => {
                                        const activeLeaf = this.app.workspace.getMostRecentLeaf();
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
                        console.error("Atomic Insights: Failed to load context", e);
                    }
                }, 0);
            }

            // Drag & Drop
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', (e) => {
                if (e.dataTransfer) {
                    const file = this.app.metadataCache.getFirstLinkpathDest(res.path, "");
                    if (file) {
                        const linkText = this.app.fileManager.generateMarkdownLink(file, this.currentFilePath ?? '');
                        e.dataTransfer.setData('text/plain', linkText);
                        e.dataTransfer.effectAllowed = 'copy';
                    }
                }
            });

            // Hover Preview
            item.addEventListener('mouseover', (event) => {
                this.app.workspace.trigger('hover-link', {
                    event,
                    source: VIEW_TYPE_ATOMIC_INSIGHTS,
                    hoverParent: this,
                    targetEl: item,
                    linktext: res.path,
                    sourcePath: this.currentFilePath ?? ''
                });
            });
        });
    }

    async onClose() {
        // Nothing to cleanup
    }
}
