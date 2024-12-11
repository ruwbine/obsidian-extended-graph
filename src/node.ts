import { App, TFile } from 'obsidian';

export interface ObsidianNode {
    circle: {
        alpha: number;
        tintColor: {
            components: Float32Array;
        }
    }
    color: {
        a: number;
        rgb: number;
    }
    text: {
        alpha: number;
        _text: string;
    }
    id: string;
    weight: number;
    x: number;
    y: number;
}

export class GraphNode {
    obsidianNode: ObsidianNode;
    _file: TFile;
    _imageUri: string | null;
    _tags: string[];

    constructor(obsidianNode: ObsidianNode, app: App) {
        this.obsidianNode = obsidianNode;
        if (app) {
            const file = app.vault.getFileByPath(obsidianNode.id);
            if (!file) throw new Error(`Could not find TFile for node ${obsidianNode.id}.`)
            this._file = file;
        }
        this.updateTags(app);
        this.updateImageUri(app);
    }

    updateTags(app: App) : void {
        if (!this._file) return;

        const metadata = app.metadataCache.getFileCache(this._file);
        this._tags = [];
        metadata?.tags?.forEach(tagCache => {
            const tag = tagCache.tag.replace('#', '');
            this._tags.push(tag);
        });
    }

    getTags() : string[] {
        return this._tags;
    }

    updateImageUri(app: App) : void {
        if (!this._file) return;

        const metadata = app.metadataCache.getFileCache(this._file);
        const frontmatter = metadata?.frontmatter;
        const image_link = frontmatter ? frontmatter['image'].replace("[[", "").replace("]]", "") : null;
        const image_file = image_link ? app.metadataCache.getFirstLinkpathDest(image_link, ".") : null;
        this._imageUri = image_file ? app.vault.getResourcePath(image_file) : null;
    }

    getImageUri() : string | null {
        return this._imageUri;
    }

    getID() : string {
        return this.obsidianNode.id;
    }

    isFile(file: TFile) : boolean {
        return this._file === file;
    }

    waitReady(): Promise<void> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (this.obsidianNode.color !== null) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 500);
        });
    }
}