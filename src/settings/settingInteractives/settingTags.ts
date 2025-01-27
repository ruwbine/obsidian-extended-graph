import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, isTagValid, SettingInteractives, TAG_KEY } from "src/internal";

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'tags', TAG_KEY, "Tags", 'tags', "Display and filter by tags");
    }

    protected override addBody(): void {
        super.addBody();
        
        // Show on graph
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(`Add arcs`)
            .setDesc(`Add arcs around the nodes to visualize the tags.`)
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return isTagValid(name);
    }

    protected override getPlaceholder(): string {
        return "tag";
    }
}