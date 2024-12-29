import { ColorComponent, Modal, setIcon, Setting, TextComponent } from "obsidian";
import { cmOptions } from "src/colors/colormaps";
import { ExtendedGraphSettingTab } from "./settingTab";
import { capitalizeFirstLetter, getFile, getFileInteractives } from "src/helperFunctions";
import { plot_colormap } from "src/colors/colors";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { INVALID_KEYS } from "src/globalVariables";

export abstract class SettingInteractives {
    settingTab: ExtendedGraphSettingTab;
    interactiveName: string;
    elementName: string;
    previewClass: string;
    noneType: string = "";
    
    settingInteractiveColor: Setting;
    colorsContainer: HTMLDivElement;
    settingInteractiveFilter: Setting;
    selectionContainer: HTMLDivElement;
    canvasPalette: HTMLCanvasElement;
    colorItems = new Map<string, Setting>();
    allTopElements: HTMLElement[] = [];

    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
    }
    

    protected displayPrepend() {
        // HEADING
        this.allTopElements.push(
            new Setting(this.settingTab.containerEl)
                .setName(capitalizeFirstLetter(this.interactiveName + 's'))
                .setHeading()
                .settingEl
        );
    };

    display() {
        this.colorItems.clear();
        let containerEl = this.settingTab.containerEl;

        this.displayPrepend();

        // NONE TYPE
        this.allTopElements.push(
            new Setting(containerEl)
                .setName('None type id')
                .setDesc(`The id which will be given to ${this.elementName} with no type`)
                .addText(cb => cb
                    .setValue(this.settingTab.plugin.settings.noneType[this.interactiveName])
                    .onChange(async (value) => {
                        value = value.trim();
                        if (value == this.noneType) return;
                        this.settingTab.plugin.settings.noneType[this.interactiveName] = value;
                        INVALID_KEYS[this.interactiveName].remove(this.noneType);
                        INVALID_KEYS[this.interactiveName].push(value);
                        this.noneType = value;
                        await this.settingTab.plugin.saveSettings();
                }))
                .settingEl
        );
        this.noneType = this.settingTab.plugin.settings.noneType[this.interactiveName];

        // COLOR PALETTE
        let settingPalette = new Setting(containerEl)
            .setName(`Color palette`)
            .setDesc(`Choose the color palette for the ${this.interactiveName}s visualizations`)
            .addDropdown(cb => cb.addOptions(cmOptions).setValue(this.settingTab.plugin.settings.colormaps[this.interactiveName])
            .onChange(async (value) => {
                plot_colormap(this.canvasPalette.id, value, false);
                this.settingTab.plugin.settings.colormaps[this.interactiveName] = value;
                this.settingTab.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.interactiveName);
                await this.settingTab.plugin.saveSettings();
            }));
        this.allTopElements.push(settingPalette.settingEl);
        settingPalette.controlEl.addClass("color-palette");
        this.canvasPalette = settingPalette.controlEl.createEl("canvas");
        this.canvasPalette.id = `canvas-palette-${this.interactiveName}`;
        this.canvasPalette.width = 100;
        this.canvasPalette.height = 20;
        plot_colormap(this.canvasPalette.id, this.settingTab.plugin.settings.colormaps[this.interactiveName], false);
        
        // SPECIFIC COLORS
        this.settingInteractiveColor = new Setting(containerEl)
            .setName(`Specific ${this.interactiveName} colors`)
            .setDesc(`Choose specific ${this.interactiveName} colors that will not be affected by the color palette`)
            .addButton(cb => {
                setIcon(cb.buttonEl, "plus");
                cb.onClick((e) => {
                    this.addColor();
                })
            });
        this.allTopElements.push(this.settingInteractiveColor.settingEl);
        
        this.colorsContainer = containerEl.createDiv("settings-colors-container");
        this.allTopElements.push(this.colorsContainer);

        this.settingTab.plugin.settings.interactiveColors[this.interactiveName].forEach((interactive) => {
            this.addColor(interactive.type, interactive.color);
        })

        // FILTER TYPES
        this.settingInteractiveFilter = new Setting(containerEl)
            .setName(`${this.interactiveName}s selection`)
            .setDesc(`Choose which ${this.interactiveName}s should be considered by the plugin`);
        this.allTopElements.push(this.settingInteractiveFilter.settingEl);
        
        this.selectionContainer = containerEl.createDiv("settings-selection-container");
        this.allTopElements.push(this.selectionContainer);

        let allTypes = this.getAllTypes();
        for (const type of allTypes) {
            const isActive = !this.settingTab.plugin.settings.unselectedInteractives[this.interactiveName].includes(type);
            let label = this.selectionContainer.createEl("label");
            let text = label.createSpan({text: type});
            let toggle = label.createEl("input", {type: "checkbox"});
            isActive ? this.selectInteractive(label, toggle) : this.deselectInteractive(label, toggle);
            toggle.addEventListener("change", e => {
                toggle.checked ? this.selectInteractive(label, toggle) : this.deselectInteractive(label, toggle);
            })
        }
    }

    protected addColor(type?: string, color?: string) : Setting {
        let colorSetting = new Setting(this.colorsContainer);
        let uuid = crypto.randomUUID();
        this.colorItems.set(uuid, colorSetting);
        
        colorSetting.addText(cb => {
            cb.setPlaceholder(this.getPlaceholder());
            type && cb.setValue(type);
            cb.onChange((name: string) => {
                this.saveColorSetting(uuid);
            })
        });

        colorSetting.addColorPicker(cb => {
            color && cb.setValue(color);
            cb.onChange((color: string) => {
                this.saveColorSetting(uuid);
            })
        });

        colorSetting.addButton(cb => {
            setIcon(cb.buttonEl, 'x');
            cb.onClick((() => {
                this.removeColorSetting(uuid);
            }))
        });

        let preview = colorSetting.controlEl.createDiv(`preview ${this.previewClass}`);
        this.updatePreview(preview, type, color);

        return colorSetting;
    }

    protected updateCSS(preview: HTMLElement, color?: string) {
        let parent = preview.parentElement;
        color ? parent?.style.setProperty("--interactive-color", color) : parent?.style.setProperty("--interactive-color", "transparent");
    }

    protected removeColorSetting(uuid: string) {
        const colorSetting = this.colorItems.get(uuid);
        if (!colorSetting) return;

        this.colorsContainer.removeChild(colorSetting.settingEl);
        this.colorItems.delete(uuid);
        this.saveColors(uuid);
    }

    protected saveColorSetting(uuid: string) {
        const colorSetting = this.colorItems.get(uuid);
        if (!colorSetting) return;

        const colorPicker = colorSetting.components.find(cb => cb.hasOwnProperty('colorPickerEl')) as ColorComponent;
        const textInput = colorSetting.components.find(cb => cb.hasOwnProperty('inputEl')) as TextComponent;
        const preview = colorSetting.controlEl.querySelector(".preview") as HTMLElement;
        const type = textInput.getValue().trim();
        const color = colorPicker.getValue();
        this.saveColor(preview, type, color);
    }

    protected selectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.addClass("is-active");
        toggle.checked = true;
        if (this.settingTab.plugin.settings.unselectedInteractives[this.interactiveName].includes(label.innerText)) {
            this.settingTab.plugin.settings.unselectedInteractives[this.interactiveName].remove(label.innerText);
            this.settingTab.plugin.saveSettings();
        }
    }

    protected deselectInteractive(label: HTMLLabelElement, toggle: HTMLInputElement) {
        label.removeClass("is-active");
        toggle.checked = false;
        if (!this.settingTab.plugin.settings.unselectedInteractives[this.interactiveName].includes(label.innerText)) {
            this.settingTab.plugin.settings.unselectedInteractives[this.interactiveName].push(label.innerText);
            this.settingTab.plugin.saveSettings();
        }
    }

    protected async saveColors(changedType: string) {
        this.settingTab.plugin.settings.interactiveColors[this.interactiveName] = [];
        this.colorItems.forEach(colorSetting => {
            const colorPicker = colorSetting.components.find(cb => cb.hasOwnProperty('colorPickerEl')) as ColorComponent;
            const textInput = colorSetting.components.find(cb => cb.hasOwnProperty('inputEl')) as TextComponent;
            const type = textInput.getValue();
            const color = colorPicker.getValue();
            this.settingTab.plugin.settings.interactiveColors[this.interactiveName].push({type: type, color: color});
        });
        this.settingTab.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.interactiveName, changedType);
        await this.settingTab.plugin.saveSettings();
    }

    protected getAllTypes(): string[] {
        let allTypes = new Set<string>();
        for (const file of this.settingTab.app.vault.getFiles()) {
            allTypes = new Set<string>([...allTypes, ...getFileInteractives(this.interactiveName, this.settingTab.app, file)]);
        }
        return [...allTypes].sort();
    }

    protected abstract saveColor(preview: HTMLElement, type: string, color: string) : void;
    protected abstract isNameValid(name: string) : boolean;
    protected abstract getPlaceholder() : string;
    protected abstract updatePreview(preview: HTMLDivElement, type?: string, color?: string) : void;
}

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab);
        this.interactiveName = "tag";
        this.elementName = "node";
        this.previewClass = "arc";
    }

    display(): void {
        super.display();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-" + this.interactiveName);
        })
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isNameValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
        else {
            preview.innerText = "";
        }
    }

    protected isNameValid(name: string) : boolean {
        return /^[a-zA-Z]+$/.test(name);
    }

    protected getPlaceholder(): string {
        return "#tag";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }
}

export class SettingPropertiesArray {
    settingTab: ExtendedGraphSettingTab;
    settingInteractives: SettingInteractives[] = [];
    allTopElements: HTMLElement[] = [];
    interactiveName: string;

    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
        for (const [key, enabled] of Object.entries(this.settingTab.plugin.settings.additionalProperties)) {
            this.settingInteractives.push(new SettingProperties(key, enabled, settingTab));
        }
    }

    display() {
        let containerEl = this.settingTab.containerEl;
        
        // HEADING
        this.allTopElements.push(
            new Setting(containerEl)
                .setName(capitalizeFirstLetter('Properties'))
                .setHeading()
                .addButton(cb => {
                    setIcon(cb.buttonEl, "plus");
                    cb.onClick((e) => {
                        this.openModalToAddInteractive();
                    })
                })
                .settingEl
        );
        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-property");
        })

        for (const setting of this.settingInteractives) {
            setting.display();
        }
    }

    protected openModalToAddInteractive() {
        let modal = new Modal(this.settingTab.app);
        modal.setTitle("Property key");
        let input = modal.contentEl.createEl("input");
        input.addEventListener('keydown', e => {
            if ("Enter" === e.key && input.value.length > 0) {
                this.addInteractive(input.value);
                modal.close();
            }
        });
        let btn = modal.contentEl.createEl("button");
        setIcon(btn, "plus");
        btn.addEventListener('click', e => {
            this.addInteractive(input.value);
            modal.close();
        })
        modal.open();
    }

    protected addInteractive(key: string) {
        this.settingTab.plugin.settings.additionalProperties[key] = true;
        this.settingTab.plugin.settings.colormaps[key] = "rainbow";
        this.settingTab.plugin.settings.interactiveColors[key] = [];
        this.settingTab.plugin.settings.unselectedInteractives[key] = [];
        this.settingTab.plugin.settings.noneType[key] = "none";
        this.settingTab.plugin.saveSettings().then(() => {
            let setting = new SettingProperties(key, true, this.settingTab);
            this.settingInteractives.push(setting);
            setting.display();
            INVALID_KEYS[key] = [this.settingTab.plugin.settings.noneType[key]];
        });
    }
}

export class SettingProperties extends SettingInteractives {
    enabled: boolean;

    constructor(key: string, enabled: boolean, settingTab: ExtendedGraphSettingTab) {
        super(settingTab);
        this.interactiveName = key;
        this.elementName = "node";
        this.previewClass = "arc";
        this.enabled = enabled;
    }

    protected displayPrepend(): void {
        // HEADING
        this.allTopElements.push(
            new Setting(this.settingTab.containerEl)
                .setName('Property: ' + this.interactiveName)
                .setHeading()
                .settingEl
        );

        // ENABLE
        this.allTopElements.push(new Setting(this.settingTab.containerEl)
            .setName('Enable')
            .addToggle(cb => {
                cb.setValue(this.enabled);
                cb.onChange((value) => {
                    this.enabled = value;
                    this.settingTab.plugin.settings.additionalProperties[this.interactiveName] = value;
                    this.settingTab.plugin.saveSettings();
                })
            }).settingEl);
    }

    display(): void {
        super.display();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-property");
        })
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isNameValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
        else {
            preview.innerText = "";
        }
    }

    protected isNameValid(name: string) : boolean {
        return (name.length > 0) && (!name.contains(":"));
    }

    protected getPlaceholder(): string {
        return "property-key";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }
}

export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab);
        this.interactiveName = "link";
        this.elementName = "link";
        this.previewClass = "line";
    }

    display(): void {
        super.display();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-" + this.interactiveName);
        })

        let labels = this.settingTab.containerEl.querySelectorAll(`.settings-selection-container.extended-graph-setting-${this.interactiveName} label`);
        let imageLabel = Array.from(labels).find(l => (l as HTMLLabelElement).innerText === this.settingTab.plugin.settings.imageProperty) as HTMLLabelElement;
        if (imageLabel) {
            let cb = imageLabel.querySelector("input") as HTMLInputElement ;
            this.deselectInteractive(imageLabel, cb);
            imageLabel.parentNode?.removeChild(imageLabel);
        }
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isNameValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
    }

    protected isNameValid(name: string) : boolean {
        return (name.length > 0) && (!name.contains(":"));
    }

    protected getPlaceholder(): string {
        return "property-key";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }

    protected getAllTypes(): string[] {
        let allTypes = new Set<string>();

        const dv = getDataviewAPI();
        if (dv) {
            for (const page of dv.pages()) {
                for (const [key, value] of Object.entries(page)) {
                    if (key === "file" || key === this.settingTab.plugin.settings.imageProperty || INVALID_KEYS["link"].includes(key)) continue;
                    if (value === null || value === undefined || value === '') continue;

                    if ((typeof value === "object") && ("path" in value)) {
                        allTypes.add(key);
                    }

                    if (Array.isArray(value)) {
                        for (const link of value) {
                            allTypes.add(key);
                        }
                    }
                }
            }
        }
        else {
            for (const file of this.settingTab.app.vault.getFiles()) {
                let frontmatterLinks = this.settingTab.app.metadataCache.getCache(file.path)?.frontmatterLinks;
                if (!frontmatterLinks) continue;
                let types = frontmatterLinks.map(l => l.key.split('.')[0]).filter(k => k !== this.settingTab.plugin.settings.imageProperty && !INVALID_KEYS["link"].includes(k));
                allTypes = new Set<string>([...allTypes, ...types]);
            }
        }
        return [...allTypes].sort();
    }
}