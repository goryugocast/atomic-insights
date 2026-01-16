import { MarkdownView, WorkspaceLeaf, TFile, setIcon, debounce } from 'obsidian';
import AtomicInsightsPlugin from './main';
import { AdamicAdar } from './AdamicAdar';

export class RelatedNotesView {
    plugin: AtomicInsightsPlugin;
    adamicAdar: AdamicAdar;
    container: HTMLElement | null = null;
    currentFile: TFile | null = null;

    debouncedUpdate: (leaf: WorkspaceLeaf) => void;

    constructor(plugin: AtomicInsightsPlugin) {
        this.plugin = plugin;
        this.adamicAdar = new AdamicAdar(plugin.app, plugin.settings);

        this.debouncedUpdate = debounce((leaf: WorkspaceLeaf) => {
            this.update(leaf);
        }, 2000, true);
    }

    update(leaf: WorkspaceLeaf) {
        if (!this.plugin.settings.showRelatedNotes) {
            this.remove();
            return;
        }

        if (!(leaf.view instanceof MarkdownView)) {
            return;
        }

        const view = leaf.view as MarkdownView;
        const file = view.file;

        if (!file) {
            return;
        }

        // If checking same file and container exists, maybe just return?
        // But we might want to re-run analysis if content changed? 
        // For now, let's re-render on active-leaf-change to be safe, 
        // or optimized later if too heavy.

        this.currentFile = file;
        this.render(view, file);
    }

    remove() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    private render(view: MarkdownView, file: TFile) {
        // Determine the correct parent element based on view mode (Source/Live Preview vs Reading View)
        let parent: HTMLElement | null = null;
        const mode = view.getMode(); // 'source' or 'preview'

        if (mode === 'source') {
            // In Live Preview/Source mode, content is managed by CodeMirror.
            // The structure is usually .cm-scroller -> .cm-sizer -> .cm-content
            // To position at the bottom of the content properly, we should inject into .cm-sizer
            // Reference: native embedded-backlinks appears to be inside .cm-sizer
            parent = view.contentEl.querySelector('.cm-sizer');

            // Fallback to scroller if sizer is not found (though it should be there in CM6)
            if (!parent) {
                parent = view.contentEl.querySelector('.cm-scroller');
            }
        } else {
            // In Reading View (Preview), content is in .markdown-preview-sizer
            // Structure: .markdown-preview-view -> .markdown-preview-sizer
            parent = view.contentEl.querySelector('.markdown-preview-sizer');
        }

        // Fallback or safety check
        if (!parent) {
            // It might be possible DOM isn't fully ready or structure is different
            console.log('Atomic Insights: Could not find parent container for mode:', mode);
            return;
        }

        // Remove from old location if mode changed or just to be safe (unique DOM ID/Class validation)
        const existingFooter = view.contentEl.querySelector('.atomic-insights-footer');
        if (existingFooter && existingFooter.parentElement !== parent) {
            existingFooter.remove();
        }

        // Check if we already have our footer in the CORRECT parent
        let footer = parent.querySelector(':scope > .atomic-insights-footer') as HTMLElement;

        if (!footer) {
            footer = parent.createDiv({ cls: 'atomic-insights-footer' });
        }

        footer.empty();

        // Run Analysis
        const results = this.adamicAdar.calculate(file.path);

        // Render Header & Controls
        const headerContainer = footer.createDiv({ cls: 'atomic-insights-header-container' });
        const header = headerContainer.createEl('h6', { text: 'Atomic Insights', cls: 'atomic-insights-header' });

        // Controls
        const controls = headerContainer.createDiv({ cls: 'atomic-insights-controls' });

        const folderBtn = controls.createEl('button', {
            cls: 'atomic-insights-control-btn' + (this.plugin.settings.showFolderNames ? ' is-active' : ''),
            title: this.plugin.settings.showFolderNames ? 'Hide Folder Names' : 'Show Folder Names'
        });

        const iconName = this.plugin.settings.showFolderNames ? 'folder-tree' : 'folder';
        setIcon(folderBtn, iconName);

        folderBtn.onclick = async () => {
            this.plugin.settings.showFolderNames = !this.plugin.settings.showFolderNames;
            await this.plugin.saveSettings();
            // Re-render
            this.render(view, file);
        };

        // Render List
        const listContainer = footer.createDiv({ cls: 'atomic-insights-list' });

        if (results.length === 0) {
            listContainer.createDiv({ cls: 'atomic-insights-empty', text: 'No strongly related notes found.' });
        } else {
            // Show top 50 (Increased to ensure Direct Links are visible)
            const topResults = results.slice(0, 50);

            topResults.forEach(res => {
                const item = listContainer.createDiv({ cls: 'atomic-insights-item' });

                const displayName = this.plugin.settings.showFolderNames
                    ? res.path.replace('.md', '')
                    : res.path.split('/').pop()?.replace('.md', '') ?? res.path;

                // --- Calculate Icon / Direction FIRST ---
                const resolvedLinks = this.plugin.app.metadataCache.resolvedLinks;
                const outgoing = resolvedLinks[file.path]?.[res.path] !== undefined;
                const incoming = resolvedLinks[res.path]?.[file.path] !== undefined;

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

                // 2. Content Container (Right: Name + Bar)
                const contentContainer = item.createDiv({ cls: 'atomic-insights-content-container' });

                // Name
                const nameEl = contentContainer.createDiv({ cls: 'atomic-insights-item-name' });
                const link = nameEl.createEl('a', {
                    cls: 'internal-link',
                    text: displayName,
                    href: res.path
                });

                // Click handling (on link)
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.plugin.app.workspace.openLinkText(res.path, file.path);
                });

                // Score Bar
                const scorePercent = Math.min(100, Math.round(res.score * 10));
                const barContainer = contentContainer.createDiv({ cls: 'atomic-insights-item-bar-container' });
                const bar = barContainer.createDiv({ cls: 'atomic-insights-item-bar' });
                bar.style.width = `${scorePercent}%`;
                bar.title = `Score: ${res.score.toFixed(2)}`;

                // Drag & Drop (on item)
                item.setAttribute('draggable', 'true');
                item.addEventListener('dragstart', (e) => {
                    if (e.dataTransfer) {
                        const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(res.path, file.path);
                        if (targetFile) {
                            const linkText = this.plugin.app.fileManager.generateMarkdownLink(targetFile, file.path);
                            e.dataTransfer.setData('text/plain', linkText);
                            e.dataTransfer.effectAllowed = 'copy';
                        }
                    }
                });

                // Hover Preview (on item)
                item.addEventListener('mouseover', (event) => {
                    this.plugin.app.workspace.trigger('hover-link', {
                        event,
                        source: 'atomic-insights-footer',
                        hoverParent: view,
                        targetEl: item,
                        linktext: res.path,
                        sourcePath: file.path
                    });
                });
            });
        }
    }
}
