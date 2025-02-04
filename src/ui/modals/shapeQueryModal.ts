import { App, ButtonComponent, DropdownComponent, Modal, SearchComponent, Setting, TextComponent } from "obsidian";
import { CombinationLogic, FOLDER_KEY, InteractivesSuggester, LINK_KEY, LogicKey, logicKeyLabel, NodeShape, PluginInstances, QueryData, QueryMatcher, QueryMatchesModal, RuleQuery, ShapeEnum, SourceKey, sourceKeyLabels, TAG_KEY, UIElements } from "src/internal";
import STRINGS from "src/Strings";

export class ShapeQueryModal extends Modal {
    saveCallback: (shape: ShapeEnum, queryData: QueryData) => void;
    shape: ShapeEnum;

    queryData: QueryData;

    viewMatchesButton: ButtonComponent;
    rulesSettings: RuleSetting[] = [];
    combinationLogicButtons: Record<CombinationLogic, ButtonComponent | null> = {
        'AND': null,
        'OR': null
    };

    constructor(app: App, shape: ShapeEnum, queryData: QueryData, saveCallback: (shape: ShapeEnum, queryData: QueryData) => void) {
        super(app);
        this.setTitle(STRINGS.query.setShapeQueryFor + ": " + STRINGS.features.shapesNames[shape]);
        this.modalEl.addClass("graph-modal-shape-query");
        this.saveCallback = saveCallback;
        this.shape = shape;
        this.queryData = queryData;
    }

    onOpen() {
        this.addShapeIcon();
        this.addCombinationLogic();
        this.addRulesHeader();
        this.addButtons();

        for (const queryRecord of this.queryData.rules) {
            this.addRule(queryRecord);
        }
    }

    private addShapeIcon() {
        const svg = NodeShape.getSVG(this.shape);
        svg.addClass("shape-svg");
        this.titleEl.insertAdjacentElement('afterbegin', svg);
    }

    private addCombinationLogic() {
        new Setting(this.contentEl)
            .setName(STRINGS.query.combinationLogic)
            .addButton(cb => {
                this.combinationLogicButtons['AND'] = cb;
                cb.setButtonText(STRINGS.query.AND);
                cb.onClick(ev => {
                    this.queryData.combinationLogic = 'AND';
                    this.combinationLogicButtons['AND']?.setCta();
                    this.combinationLogicButtons['OR']?.removeCta();
                })
            })
            .addButton(cb => {
                this.combinationLogicButtons['OR'] = cb;
                cb.setButtonText(STRINGS.query.OR);
                cb.onClick(ev => {
                    this.queryData.combinationLogic = 'OR';
                    this.combinationLogicButtons['AND']?.removeCta();
                    this.combinationLogicButtons['OR']?.setCta();
                })
            })
            .then(cb => {
                this.combinationLogicButtons[this.queryData.combinationLogic]?.setCta();
            });
    }

    private addRulesHeader() {
        new Setting(this.contentEl)
            .setName(STRINGS.query.rules)
            .setHeading()
            .addButton(cb => {
                UIElements.setupButton(cb, 'add');
                cb.onClick((e) => {
                    this.addRule();
                });
            });
    }

    private addRule(queryRecord?: Record<string, string>) {
        const ruleSetting = new RuleSetting(
            this.contentEl,
            this.removeRule.bind(this),
            this.onChange.bind(this),
            queryRecord
        );
        this.rulesSettings.push(ruleSetting);
    }

    private removeRule(ruleSetting: RuleSetting) {
        this.rulesSettings.remove(ruleSetting);
        ruleSetting.settingEl.remove();
    }

    private addButtons() {
        const container = this.modalEl.createDiv({ cls: 'buttons-container' });

        new ButtonComponent(container)
			.setButtonText(STRINGS.controls.cancel)
			.onClick(() => this.close());

        this.viewMatchesButton = new ButtonComponent(container)
            .setButtonText(STRINGS.query.viewMatches)
            .onClick(() => this.viewMatches());

		new ButtonComponent(container)
            .setButtonText(STRINGS.controls.save)
			.setIcon('save')
			.onClick(() => this.save())
			.setCta();
    }

    onChange(ruleQuery: RuleQuery) {
        const matcher = this.getMatcher();
        const files = matcher.getMatches();
        this.viewMatchesButton.setButtonText(`${STRINGS.query.viewMatches} (${files.length})`);
        this.viewMatchesButton.setDisabled(files.length === 0);
    }

    private viewMatches() {
        const modal = new QueryMatchesModal(this.queryData);
        modal.open();
    }
    
	onClose(): void {
		this.contentEl.empty();
	}

    private save(): void {
        this.setQueryData();
        this.saveCallback(this.shape, this.queryData);
        this.close();
    }

    private setQueryData() {
        const queries: RuleQuery[] = [];
        for (const rule of this.rulesSettings) {
            queries.push(rule.getRuleQuery());
        }
        this.queryData.rules = queries.map(query => query.getRecord());
    }

    private getMatcher(): QueryMatcher {
        this.setQueryData();
        return new QueryMatcher(this.queryData);
    }
}


class RuleSetting extends Setting {
    onRemoveCallback: (s: RuleSetting) => void;
    onChangeCallback: (r: RuleQuery) => void

    sourceDropdown: DropdownComponent;
    propertyDropdown: DropdownComponent | null;
    logicDropdown: DropdownComponent;
    valueText: SearchComponent | null;
    suggester: InteractivesSuggester;

    constructor(containerEl: HTMLElement, onRemove: (s: RuleSetting) => void, onChange: (r: RuleQuery) => void, queryRecord?: Record<string, string>) {
        super(containerEl);

        this.onRemoveCallback = onRemove;

        this.setClass('rule-setting');
        this.addRemoveButton();
        this.addSourceDropdown();
        this.addLogicDropdown();
        this.addValueText();

        if (queryRecord) {
            this.sourceDropdown.setValue(queryRecord['source']);
            this.propertyDropdown?.setValue(queryRecord['property']);
            this.logicDropdown.setValue(queryRecord['logic']);
            this.valueText?.setValue(queryRecord['value']);
        }

        this.onChangeCallback = onChange;
        this.onChange();
    }

    private addRemoveButton(): RuleSetting {
        return this.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'delete');
            cb.onClick(() => {
                this.onRemoveCallback(this);
            });
        });
    }

    private addSourceDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.sourceDropdown = cb;
            cb.addOptions(sourceKeyLabels);
            cb.onChange(value => {
                if (value === 'property') {
                    this.addPropertyDropdown();
                }
                else if (this.propertyDropdown) {
                    this.propertyDropdown.selectEl.parentNode?.removeChild(this.propertyDropdown.selectEl);
                }
                this.onChange();
			});
        });
    }

    private addPropertyDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.propertyDropdown = cb;
            this.controlEl.insertAfter(cb.selectEl, this.sourceDropdown.selectEl);
            const properties = PluginInstances.app.metadataTypeManager.properties;
            cb.addOptions(Object.keys(properties).sort().reduce((res: Record<string, string>, key: string) => (res[key] = properties[key].name, res), {} ));
            cb.onChange(value => {
                this.onChange();
            });
        });
    }

    private addLogicDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.logicDropdown = cb;
            cb.addOptions(logicKeyLabel);
            cb.onChange((value: LogicKey) => {
                if (value !== 'isEmpty' && value !== 'isEmptyNot') {
                    if (!this.valueText) this.addValueText();
                }
                else if (this.valueText) {
                    this.valueText.containerEl.parentNode?.removeChild(this.valueText.containerEl);
                    this.valueText = null;
                }
                this.onChange();
            });
        })
    }

    private addValueText(): RuleSetting {
        return this.addSearch(cb => {
            this.valueText = cb;
            cb.setPlaceholder(STRINGS.plugin.valuePlaceholder);
            cb.inputEl.setAttr('required', true);
            this.suggester = new InteractivesSuggester(this.valueText.inputEl, (value: string) => {
                this.onChange();
            });
            cb.onChange(value => {
                this.onChange();
            })
        });
    }

    onChange(): void {
        const logic = this.logicDropdown.getValue() as LogicKey;
        switch (logic) {
            case 'containsRegex':
            case 'containsRegexNot':
            case 'matchesRegex':
            case 'matchesRegexNot':
                this.suggester.setKey();
                break;
            default:
                this.suggester.setKey(this.sourceDropdown.getValue() as SourceKey, this.propertyDropdown?.getValue());
                break;
        }

        const ruleQuery = this.getRuleQuery();
        this.setValidity(ruleQuery);
        this.onChangeCallback(ruleQuery);
    }

    private setValidity(ruleQuery: RuleQuery): void {
        if (!ruleQuery.isValid()) {
            this.settingEl.addClass("query-invalid");
        }
        else {
            this.settingEl.removeClass("query-invalid");
        }
    }

    getRuleQuery(): RuleQuery {
        return new RuleQuery({
            source  : this.sourceDropdown.getValue(),
            property: this.propertyDropdown?.getValue() ?? '',
            value   : this.valueText?.getValue() ?? '',
            logic   : this.logicDropdown.getValue(),
        });
    }
}

