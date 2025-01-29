import { DropdownComponent, setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, GraphAnalysisPlugin, isPropertyKeyValid, LinkStatCalculator, LinkStatFunction, linkStatFunctionLabels, linkStatFunctionNeedsNLP, NodeStatCalculatorFactory, NodeStatFunction, nodeStatFunctionLabels, PluginInstances, SettingColorPalette, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingElementsStats extends SettingsSectionCollapsible {
    warningNodeSizeSetting: Setting;
    warningNodeColorSetting: Setting;
    linksSizeFunctionDropdown: DropdownComponent | undefined;
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'elements-stats', '', STRINGS.features.elementsStats, 'chart-pie', STRINGS.features.elementsStatsDesc);
    }

    protected override addBody(): void {
        this.addNodeSizeProperty();
        this.addNodeSizeFunction();
        this.addNodeSizeWarning();

        this.addNodeColorFunction();
        this.addNodeColorWarning();
        this.addColorPaletteSetting();

        if (PluginInstances.graphsManager?.getGraphAnalysis()["graph-analysis"]) {
            this.addLinkSizeFunction();
        }
    }

    private addNodeSizeProperty(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeSizesProperty)
            .setDesc(STRINGS.features.nodeSizesPropertyDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.nodesSizeProperty)
                .onChange(async (key) => {
                    if (key === "" || isPropertyKeyValid(key)) {
                        PluginInstances.settings.nodesSizeProperty = key;
                        await PluginInstances.plugin.saveSettings();
                    }
            }));
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeSizesFunction)
            .setDesc(STRINGS.features.nodeSizesFunctionDesc)
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(PluginInstances.settings.nodesSizeFunction);
                cb.onChange((value) => {
                    this.recomputeNodesSizes(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addLinkSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.linkSizesFunction)
            .setDesc(STRINGS.features.linkSizesFunctionDesc)
            .addDropdown(cb => {
                this.linksSizeFunctionDropdown = cb;
                const nlp = PluginInstances.graphsManager?.getGraphAnalysis().nlp;
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => !linkStatFunctionNeedsNLP[entry[0] as LinkStatFunction] || nlp)
                    )
                );
                cb.setValue(PluginInstances.settings.linksSizeFunction);
                cb.onChange((value) => {
                    this.recomputeLinksSizes(value as LinkStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeWarning(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setClass("setting-warning")
            .then(cb => {
                setIcon(cb.nameEl, 'triangle-alert');
            });
            
        this.elementsBody.push(setting.settingEl);
        this.warningNodeSizeSetting = setting;
        this.setWarning(setting);
    }
    
    private addNodeColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeColorsFunction)
            .setDesc(STRINGS.features.nodeColorsFunctionDesc)
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(PluginInstances.settings.nodesColorFunction);
                cb.onChange((value) => {
                    this.recomputeNodeColors(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }
    
    private addColorPaletteSetting(): void {
        const setting = new SettingColorPalette(this.containerEl, PluginInstances.plugin.app, 'elements-stats')
            .setDesc(STRINGS.features.nodeColorsPaletteDesc);

        setting.setValue(PluginInstances.settings.nodesColorColormap);

        setting.onPaletteChange((palette: string) => {
            PluginInstances.settings.nodesColorColormap = palette;
            PluginInstances.plugin.app.workspace.trigger('extended-graph:settings-nodecolorpalette-changed');
            PluginInstances.plugin.saveSettings();
        });

        // Push to body list
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeColorWarning(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setClass("setting-warning")
            .then(cb => {
                setIcon(cb.nameEl, 'triangle-alert');
            });
            
        this.elementsBody.push(setting.settingEl);
        this.warningNodeColorSetting = setting;
        this.setWarning(setting);
    }







    private setWarning(warningSetting: Setting): void {
        const warning = PluginInstances.graphsManager?.nodesSizeCalculator?.getWarning();
        if (warning && warning !== "") {
            warningSetting.setDesc(warning);
            warningSetting.settingEl.style.setProperty("display", "");
        }
        else {
            warningSetting.setDesc("");
            warningSetting.settingEl.style.setProperty("display", "none");
        }
    }

    private recomputeNodesSizes(functionKey: NodeStatFunction): void {
        PluginInstances.settings.nodesSizeFunction = functionKey;
        PluginInstances.plugin.saveSettings();

        PluginInstances.graphsManager.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size');
        PluginInstances.graphsManager.nodesSizeCalculator?.computeStats();
        this.setWarning(this.warningNodeSizeSetting);
    }

    private recomputeNodeColors(functionKey: NodeStatFunction): void {
        PluginInstances.settings.nodesColorFunction = functionKey;
        PluginInstances.graphsManager.nodeColorCalculator = NodeStatCalculatorFactory.getCalculator('color');
        PluginInstances.graphsManager.nodeColorCalculator?.computeStats();
        this.setWarning(this.warningNodeColorSetting);
        PluginInstances.plugin.saveSettings();
    }

    private recomputeLinksSizes(functionKey: LinkStatFunction): void {
        const ga = PluginInstances.graphsManager.getGraphAnalysis();
        if (!ga && functionKey !== 'default') {
            return;
        }
        else if (!ga.nlp && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${STRINGS.notices.nlpPluginRequired} (${functionKey})`);
            functionKey = 'default';
            this.linksSizeFunctionDropdown?.setValue(functionKey);
        }
    
        PluginInstances.settings.linksSizeFunction = functionKey;
        PluginInstances.plugin.saveSettings();

        if (functionKey === 'default') {
            PluginInstances.graphsManager.linksSizeCalculator = undefined;
            return;
        }

        const graphAnalysisPlugin = PluginInstances.app.plugins.getPlugin("graph-analysis") as GraphAnalysisPlugin | null;
        if (!graphAnalysisPlugin) return;
        if (!PluginInstances.graphsManager.linksSizeCalculator) {
            PluginInstances.graphsManager.linksSizeCalculator = new LinkStatCalculator('size', graphAnalysisPlugin.g);
        }
        PluginInstances.graphsManager.linksSizeCalculator.computeStats(PluginInstances.settings.linksSizeFunction);
    }
}