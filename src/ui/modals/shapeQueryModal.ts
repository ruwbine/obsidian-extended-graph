import { App, ButtonComponent, DropdownComponent, Modal, setIcon, Setting, TextComponent } from "obsidian";
import { BUTTON_ADD_CLASS, BUTTON_DELETE_CLASS } from "src/globalVariables";
import { NodeShape, ShapeEnum } from "src/graph/graphicElements/nodes/shapes";
import { CombinationLogic, QueryData, QueryMatcher } from "src/queries/queriesMatcher";
import { logicKeyLabel, RuleQuery, sourceKeyLabels } from "src/queries/ruleQuery";
import { QueryMatchesModal } from "./queryMatchesModal";

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
        this.setTitle("Set shape query for: " + shape);
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
            .setName("Combination logic")
            .addButton(cb => {
                this.combinationLogicButtons['AND'] = cb;
                cb.setButtonText("And");
                cb.onClick(ev => {
                    this.queryData.combinationLogic = 'AND';
                    this.combinationLogicButtons['AND']?.setCta();
                    this.combinationLogicButtons['OR']?.removeCta();
                })
            })
            .addButton(cb => {
                this.combinationLogicButtons['OR'] = cb;
                cb.setButtonText("Or");
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
            .setName("Rules")
            .setHeading()
            .addButton(cb => {
                cb.setClass(BUTTON_ADD_CLASS);
                setIcon(cb.buttonEl, "plus");
                cb.onClick((e) => {
                    this.addRule();
                });
            });
    }

    private addRule(queryRecord?: Record<string, string>) {
        const ruleSetting = new RuleSetting(
            this.contentEl,
            this.app,
            this.removeRule.bind(this),
            this.onChange.bind(this),
            queryRecord
        );
        this.rulesSettings.push(ruleSetting);
        ruleSetting.onChange();
    }

    private removeRule(ruleSetting: RuleSetting) {
        this.rulesSettings.remove(ruleSetting);
        ruleSetting.settingEl.remove();
    }

    private addButtons() {
        const container = this.modalEl.createDiv({ cls: 'buttons-container' });

        new ButtonComponent(container)
			.setButtonText("Cancel")
			.onClick(() => this.close());

        this.viewMatchesButton = new ButtonComponent(container)
            .setButtonText("View matches")
            .onClick(() => this.viewMatches());

		new ButtonComponent(container)
            .setButtonText("Save")
			.setIcon('save')
			.onClick(() => this.save())
			.setCta();
    }

    onChange(ruleQuery: RuleQuery) {
        const matcher = this.getMatcher();
        const files = matcher.getMatches(this.app);
        this.viewMatchesButton.setButtonText(`View matches (${files.length})`);
        this.viewMatchesButton.setDisabled(files.length === 0);
    }

    private viewMatches() {
        const modal = new QueryMatchesModal(this.app, this.queryData);
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
    app: App;

    onRemoveCallback: (s: RuleSetting) => void;
    onChangeCallback: (r: RuleQuery) => void

    sourceDropdown: DropdownComponent;
    propertyDropdown: DropdownComponent | null;
    logicDropdown: DropdownComponent;
    valueText: TextComponent;

    constructor(containerEl: HTMLElement, app: App, onRemove: (s: RuleSetting) => void, onChange: (r: RuleQuery) => void, queryRecord?: Record<string, string>) {
        super(containerEl);
        this.app = app;

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
            this.valueText.setValue(queryRecord['value']);
        }

        this.onChangeCallback = onChange;
    }

    private addRemoveButton(): RuleSetting {
        return this.addExtraButton(button => {
            button.extraSettingsEl.addClass(BUTTON_DELETE_CLASS);
            button.setIcon('trash');
            button.setTooltip('Remove');
            button.onClick(() => {
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
                    this.controlEl.removeChild(this.propertyDropdown.selectEl);
                }
                this.onChange();
			});
        });
    }

    private addPropertyDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.propertyDropdown = cb;
            this.controlEl.insertAfter(cb.selectEl, this.sourceDropdown.selectEl);
            const properties = this.app.metadataTypeManager.properties;
            cb.addOptions(Object.keys(properties).sort().reduce((res: Record<string, string>, key: string) => (res[key] = properties[key].name, res), {} ));
            cb.onChange(value => {
                this.onChange();
            })
        });
    }

    private addLogicDropdown(): RuleSetting {
        return this.addDropdown(cb => {
            this.logicDropdown = cb;
            cb.addOptions(logicKeyLabel);
            cb.onChange(value => {
                this.onChange();
            })
        })
    }

    private addValueText(): RuleSetting {
        return this.addText(cb => {
            this.valueText = cb;
            cb.setPlaceholder("value...");
            cb.onChange(value => {
                this.onChange();
            });
            cb.inputEl.setAttr('required', true);
        });
    }

    onChange(): void {
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
            value   : this.valueText.getValue(),
            logic   : this.logicDropdown.getValue(),
        });
    }
}

