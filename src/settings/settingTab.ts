import { App, PluginSettingTab, Setting } from "obsidian";
import GraphExtendedPlugin from "src/main";
import { SettingImages } from "./settingImages";
import { SettingFocus } from "./settingFocus";
import { SettingTags } from "./settingInteractives.ts/settingTags";
import { SettingPropertiesArray } from "./settingInteractives.ts/settingProperties";
import { SettingLinks } from "./settingInteractives.ts/settingLinks";
import { SettingFolders } from "./settingInteractives.ts/settingFolders";
import { SettingPerformance } from "./settingPerformance";

export interface SettingsSection {
    display(): void;
}

export class ExtendedGraphSettingTab extends PluginSettingTab {
    plugin: GraphExtendedPlugin;
    sections: SettingsSection[] = [];

    constructor(app: App, plugin: GraphExtendedPlugin) {
        super(app, plugin);
        this.plugin = plugin;

        this.sections.push(new SettingTags(this));
        this.sections.push(new SettingPropertiesArray(this));
        this.sections.push(new SettingLinks(this));
        this.sections.push(new SettingFolders(this));
        this.sections.push(new SettingImages(this));
        this.sections.push(new SettingFocus(this));
        this.sections.push(new SettingPerformance(this));
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.addClass("extended-graph-settings");

        new Setting(containerEl)
            .setName('Global filter')
            .setDesc('This filter query will be prepend at the beginning of every graph filter')
            .addTextArea(cb => cb
                .setValue(this.plugin.settings.globalFilter)
                .onChange(async (value) => {
                    this.plugin.settings.globalFilter = value;
                    await this.plugin.saveSettings();
                    this.plugin.graphsManager.onGlobalFilterChanged(value);
            }));

        new Setting(containerEl)
            .setName(`Disable nodes`)
            .setDesc(`When all arcs are disabled on the node, remove it from the graph.`)
            .addToggle(cb => {
                cb.setValue(!this.plugin.settings.fadeOnDisable);
                cb.onChange(value => {
                    this.plugin.settings.fadeOnDisable = !value;
                    this.plugin.saveSettings();
                })
            });

        // FEATURES
        for (const section of this.sections) {
            section.display();
        }
    }
}