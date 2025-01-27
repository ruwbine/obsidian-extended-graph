import { ExtendedGraphSettingTab, Feature, SettingsSection } from "src/internal";


export abstract class SettingsSectionCollapsible extends SettingsSection {
    feature: Feature;
    interactiveKey: string;
    itemClasses: string[] = [];
    cssDisplayProperty: string;
    
    constructor(settingTab: ExtendedGraphSettingTab, feature: Feature, key: string, title: string, icon: string, description: string) {
        super(settingTab, title, icon, description);

        this.feature = feature;
        this.interactiveKey = key;
        this.itemClasses.push(`setting-${this.feature}`);
        if (key !== '') this.itemClasses.push(`setting-${this.feature}-${key}`);
        this.cssDisplayProperty = `--display-settings-${this.feature}`;
    }

    override display() {
        super.display();

        this.addToggle();

        this.elementsBody.forEach(el => {
            el.addClasses(this.itemClasses);
        });
    }

    protected addToggle() {
        const enableFeature = this.settingTab.plugin.settings.enableFeatures[this.feature];
        let enable = enableFeature;
        if (this.feature === 'property-key') {
            enable = this.settingTab.plugin.settings.additionalProperties[this.interactiveKey];
        }
        this.settingHeader.addToggle(cb => {
            cb.setValue(enable);
            cb.onChange(value => {
                this.toggle(value);
            });
        });
        this.toggle(enable);
    }

    private toggle(enable: boolean) {
        if (this.feature === 'property-key') {
            this.settingTab.plugin.settings.additionalProperties[this.interactiveKey] = enable;
        }
        else {
            this.settingTab.plugin.settings.enableFeatures[this.feature] = enable;
        }
        this.settingTab.plugin.saveSettings();
        this.containerEl.style.setProperty(this.cssDisplayProperty, enable ? 'flex' : 'none');
        if (enable) {
            this.settingHeader.settingEl.removeClass('is-collapsed');
        }
        else {
            this.settingHeader.settingEl.addClass('is-collapsed');
        }
    }
}