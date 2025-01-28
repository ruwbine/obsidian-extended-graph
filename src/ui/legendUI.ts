import { Component, ExtraButtonComponent, Setting } from "obsidian";
import { FOLDER_KEY, GraphEventsDispatcher, InteractiveManager, InteractiveUI, PluginInstances, textColor } from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

class LegendRow extends Setting {
    name: string;
    disableAllButton: ExtraButtonComponent;
    enableAllButton: ExtraButtonComponent;
    cssBGColorVariable: string;
    cssTextColorVariable: string;
    manager: InteractiveManager;

    constructor(name: string, manager: InteractiveManager, containerEl: HTMLElement) {
        super(containerEl);
        this.name = name;
        this.manager = manager;
        this.cssBGColorVariable = "--legend-color-rgb";
        this.cssTextColorVariable = "--legend-text-color";

        this.setName(this.name)
            .setTooltip(this.name)
            .addExtraButton(cb => {
                this.disableAllButton = cb;
                cb.setIcon("copy")
                    .setTooltip(STRINGS.controls.disableAll + ": " + this.name)
                    .onClick(() => {
                        this.disableAll();
                    });
            })
            .addExtraButton(cb => {
                this.enableAllButton = cb;
                cb.setIcon("copy-check")
                    .setTooltip(STRINGS.controls.enableAll + ": " + this.name)
                    .onClick(() => {
                        this.enableAll();
                    })
                    .then(cb => {
                        cb.extraSettingsEl.style.display = "none";
                    });
            })
            .setClass(`graph-legend-${name}s-row`);
    }

    private getClassName(type: string): string {
        return "graph-legend-" + type.replace(" ", "-");
    }

    addLegend(type: string, color: Uint8Array): void {
        this.addButton(cb => {
            cb.setClass(this.getClassName(type))
                .setClass("graph-legend")
                .setButtonText(type)
                .onClick(() => {
                    this.toggle(type);
                })
                .then(cb => {
                    cb.buttonEl.style.setProperty(this.cssBGColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
                    cb.buttonEl.style.setProperty(this.cssTextColorVariable, textColor(color));
                    if (type === this.manager.settings.interactiveSettings[this.name].noneType) {
                        cb.buttonEl.addClass("graph-legend-none");
                    }
                });
        })

        const sortByName = function(a: HTMLButtonElement, b: HTMLButtonElement) {
            return b.className.replace("graph-legend", "").toLowerCase().localeCompare(a.className.replace("graph-legend", "").toLowerCase());
        };
    
        const sortedChildren = Array.from(this.controlEl.getElementsByClassName("graph-legend")).sort(sortByName);
        for (let i = sortedChildren.length-1; i >= 0; i--) {
            this.controlEl.appendChild(sortedChildren[i]);
        }
    }

    updateLegend(type: string, color: Uint8Array): void {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (!button) {
            this.addLegend(type, color)
        }
        else {
            (button as HTMLElement).style.setProperty(this.cssBGColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
            (button as HTMLElement).style.setProperty(this.cssTextColorVariable, textColor(color));
        }
    }

    removeLegend(types: string[]) {
        types.forEach(type => {
            const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
            button?.parentNode?.removeChild(button);
        })
    }

    toggle(type: string) {
        const interactive = this.manager.interactives.get(type);
        if (!interactive) return;

        if (interactive.isActive) {
            this.disable(type);
            this.manager.disable([type]);
            const allAreDisabled = !this.manager.getTypes().some(t => this.manager.isActive(t));
            if (allAreDisabled) {
                this.disableAllButton.extraSettingsEl.style.display = "none";
                this.enableAllButton.extraSettingsEl.style.display = "";
            }
        }
        else {
            this.enable(type);
            this.manager.enable([type]);
            const allAreEnabled = !this.manager.getTypes().some(t => !this.manager.isActive(t));
            if (allAreEnabled) {
                this.disableAllButton.extraSettingsEl.style.display = "";
                this.enableAllButton.extraSettingsEl.style.display = "none";
            }
        }
    }

    disable(type: string) {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (button) button.addClass("is-hidden");
    }

    enable(type: string) {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (button) button.removeClass("is-hidden");
    }

    disableAll() {
        for(const type of this.manager.getTypes()) {
            this.disable(type);
        }
        this.manager.disable(this.manager.getTypes());
        this.disableAllButton.extraSettingsEl.style.display = "none";
        this.enableAllButton.extraSettingsEl.style.display = "";
    }

    enableAll() {
        for(const type of this.manager.getTypes()) {
            this.enable(type);
        }
        this.manager.enable(this.manager.getTypes());
        this.disableAllButton.extraSettingsEl.style.display = "";
        this.enableAllButton.extraSettingsEl.style.display = "none";
    }
}

export class LegendUI extends Component implements InteractiveUI {
    dispatcher: GraphEventsDispatcher;

    viewContent: HTMLElement;
    legendRows: Map<string, LegendRow>;

    isOpen: boolean;
    
    root: HTMLDivElement;
    toggleButton: ExtraButtonComponent;

    constructor(dispatcher: GraphEventsDispatcher) {
        super();
        this.dispatcher = dispatcher;
        this.viewContent = dispatcher.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
    
        // TOGGLE BUTTON
        const graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;
        this.toggleButton = new ExtraButtonComponent(graphControls)
            .setTooltip(STRINGS.controls.openLegend)
            .setIcon("tags")
            .onClick(() => {
                if (this.isOpen) {
                    this.close();
                }
                else {
                    this.open();
                }
            })
            .then(cb => {
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-legend"]);
            });

        this.legendRows = new Map<string, LegendRow>();
        this.root = this.viewContent.createDiv();
        this.root?.addClass("graph-legend-container");
        for (const [key, manager] of this.dispatcher.graph.interactiveManagers) {
            if (key === FOLDER_KEY) continue;
            if (manager) this.legendRows.set(key, new LegendRow(key, manager, this.root));
        }

        if (PluginInstances.settings.collapseLegend) {
            this.close();
        }
        else {
            this.open();
        }
    }

    onunload(): void {
        this.root.remove();
        this.toggleButton.extraSettingsEl.remove();
    }

    update(row: string, type: string, color: Uint8Array) {
        this.legendRows.get(row)?.updateLegend(type, color);
    }

    add(row: string, type: string, color: Uint8Array) {
        this.legendRows.get(row)?.addLegend(type, color);
    }

    remove(row: string, types: string[]) {
        this.legendRows.get(row)?.removeLegend(types);
    }

    toggle(row: string, type: string) {
        this.legendRows.get(row)?.toggle(type);
    }

    disableUI(row: string, type: string) {
        this.legendRows.get(row)?.disable(type);
    }

    enableUI(row: string, type: string) {
        this.legendRows.get(row)?.enable(type);
    }

    enableAllUI(row: string) {
        this.legendRows.get(row)?.manager.getTypes().forEach(type => {
            this.legendRows.get(row)?.enable(type);
        })
    }

    disableAllUI(row: string) {
        this.legendRows.get(row)?.manager.getTypes().forEach(type => {
            this.legendRows.get(row)?.disable(type);
        })
    }

    open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.isOpen = true;
        PluginInstances.settings.collapseLegend = false;
        PluginInstances.plugin.saveSettings();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        PluginInstances.settings.collapseLegend = true;
        PluginInstances.plugin.saveSettings();
    }
}