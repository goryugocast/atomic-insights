export class AbstractInputSuggest<T> {
    app: any;
    inputEl: HTMLInputElement | HTMLDivElement;

    constructor(app: any, inputEl: HTMLInputElement | HTMLDivElement) {
        this.app = app;
        this.inputEl = inputEl;
    }

    setValue(value: string): void {
        if ('value' in this.inputEl) {
            (this.inputEl as HTMLInputElement).value = value;
        }
    }

    getValue(): string {
        return 'value' in this.inputEl ? (this.inputEl as HTMLInputElement).value : '';
    }

    onSelect(_callback: (value: T, evt: MouseEvent | KeyboardEvent) => any): this {
        return this;
    }

    close(): void {}
}

export class App {}
export class PluginSettingTab {}
export class MarkdownView {}
export class SearchComponent {
    inputEl: HTMLInputElement;

    constructor(_containerEl: HTMLElement) {
        this.inputEl = document.createElement('input');
    }

    setPlaceholder(value: string): this {
        this.inputEl.placeholder = value;
        return this;
    }

    setValue(value: string): this {
        this.inputEl.value = value;
        return this;
    }

    onChange(_callback: (value: string) => any): this {
        return this;
    }
}
export class TFolder {
    path = '';
}

export function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export function setIcon(_el: HTMLElement, _icon: string): void {}
