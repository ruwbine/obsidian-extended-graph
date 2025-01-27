import { Modal, Setting } from "obsidian";
import { ExtendedGraphSettings, Graph } from "src/internal";
import ExtendedGraphPlugin from "src/main";

export class ExportSVGOptionModal extends Modal {
    graph?: Graph;
    graphSettings?: ExtendedGraphSettings;
    plugin: ExtendedGraphPlugin;
    settings: ExtendedGraphSettings;
    isCanceled: boolean = true;

    constructor(plugin: ExtendedGraphPlugin, graph?: Graph) {
        super(plugin.app);
        this.graph = graph;
        this.plugin = plugin;
        this.settings = plugin.settings;
        this.graphSettings = graph?.staticSettings;

        this.setTitle("SVG Export options");
    }

    onOpen() {
        this.addCoreOptions();
        this.addExtendedOptions();
        this.addApply();
    }

    // ============================= CORE OPTIONS ==============================

    private addCoreOptions() {
        this.addOnlyVisibleArea();
        this.addShowNodeNames();
    }

    private addOnlyVisibleArea() {
        new Setting(this.contentEl)
            .setName("Export only visible area")
            .addToggle(cb => {
                cb.setValue(this.settings.exportSVGOptions.onlyVisibleArea);
                cb.onChange(value => {
                    this.settings.exportSVGOptions.onlyVisibleArea = value;
                    this.saveSettings();
                })
            });
    }

    private addShowNodeNames() {
        new Setting(this.contentEl)
            .setName("Show node names")
            .addToggle(cb => {
                cb.setValue(this.settings.exportSVGOptions.showNodeNames);
                cb.onChange(value => {
                    this.settings.exportSVGOptions.showNodeNames = value;
                    this.saveSettings();
                })
            });
    }

    // =========================== EXTENDED OPTIONS ============================

    private addExtendedOptions() {
        if (!this.graph) return;

        this.addUseCurvedLinks();
        this.addUseNodeShapes();
        this.addShowArcs();
        this.addShowFolders();
    }

    private addUseCurvedLinks() {
        const canUseCurvedLinks = this.canUseCurvedLinks();
        this.settings.exportSVGOptions.useCurvedLinks = canUseCurvedLinks;
        if (!canUseCurvedLinks) return;

        new Setting(this.contentEl)
            .setName("Use curved links")
            .addToggle(cb => {
                cb.setValue(this.settings.exportSVGOptions.useCurvedLinks);
                cb.onChange(value => {
                    this.settings.exportSVGOptions.useCurvedLinks = value;
                    this.saveSettings();
                })
            });
    }

    private canUseCurvedLinks() {
        if (!this.graphSettings) return false;
        return this.graphSettings.enableFeatures['links'] && this.graphSettings.enableFeatures['curvedLinks'];
    }

    private addUseNodeShapes() {
        const canUseNodeShapes = this.canUseNodeShapes();
        this.settings.exportSVGOptions.useNodesShapes = canUseNodeShapes;
        if (!canUseNodeShapes) return;

        new Setting(this.contentEl)
            .setName("Use nodes shapes")
            .addToggle(cb => {
                cb.setValue(this.settings.exportSVGOptions.useNodesShapes);
                cb.onChange(value => {
                    this.settings.exportSVGOptions.useNodesShapes = value;
                    this.saveSettings();
                })
            });
    }

    private canUseNodeShapes(): boolean {
        if (!this.graphSettings) return false;
        return this.graphSettings.enableFeatures['shapes'] ?? false
    }

    private addShowArcs() {
        const canShowArcs = this.canShowArcs();
        this.settings.exportSVGOptions.showArcs = canShowArcs;
        if (!canShowArcs) return;

        new Setting(this.contentEl)
            .setName("Show arcs (tags and/or types)")
            .addToggle(cb => {
                cb.setValue(this.settings.exportSVGOptions.showArcs);
                cb.onChange(value => {
                    this.settings.exportSVGOptions.showArcs = value;
                    this.saveSettings();
                })
            });
    }

    private canShowArcs(): boolean {
        if (!this.graphSettings) return false;
        if (this.graphSettings.enableFeatures['tags']) return true;
        if (!this.graphSettings.enableFeatures['properties']) return false;
        return Object.values(this.graphSettings.additionalProperties).some(b => b);
    }

    private addShowFolders() {
        const canShowFolders = this.canShowFolders();
        this.settings.exportSVGOptions.showFolders = canShowFolders;
        if (!canShowFolders) return;

        new Setting(this.contentEl)
            .setName("Show folder boxes")
            .addToggle(cb => {
                cb.setValue(this.settings.exportSVGOptions.showFolders);
                cb.onChange(value => {
                    this.settings.exportSVGOptions.showFolders = value;
                    this.saveSettings();
                })
            });
    }

    private canShowFolders(): boolean {
        if (!this.graphSettings) return false;
        return this.graphSettings.enableFeatures['folders'];
    }

    // ============================ APPLY AND CLOSE ============================

    private addApply() {
        const setting = new Setting(this.contentEl)
            .addButton(cb => {
                cb.setButtonText("Copy svg code to clipboard");
                cb.onClick(() => {
                    this.isCanceled = false;
                    this.settings.exportSVGOptions.asImage = false;
                    this.applyAndClose();
                })
            });
            
        if (ClipboardItem.supports("image/svg+xml")) {
            setting.addButton(cb => {
                cb.setButtonText("Copy screenshot to clipboard");
                cb.setCta();
                cb.onClick(() => {
                    this.isCanceled = false;
                    this.settings.exportSVGOptions.asImage = true;
                    this.applyAndClose();
                })
            })
        }
    }

    private async saveSettings(): Promise<void> {
        if (this.graphSettings) this.graphSettings.exportSVGOptions = this.settings.exportSVGOptions;
        await this.plugin.saveSettings();
    }

    private applyAndClose() {
        this.saveSettings().then(() => {
            this.close();
        })
    }
}

