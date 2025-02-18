import { AbstractInputSuggest } from "obsidian";
import { PluginInstances } from "src/pluginInstances";

export class PropertiesSuggester extends AbstractInputSuggest<HTMLElement> {
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(PluginInstances.app, textInputEl);
        this.callback = callback;
    }

    protected getSuggestions(query: string): HTMLElement[] {
        const values = Object.keys(PluginInstances.app.metadataTypeManager.properties);

        let filteredValues = values.filter(value => value.contains(query));
        let sortedValues = new Set(filteredValues.sort());
        return [...sortedValues].map(value => {
            const split = value.split(query);
            let innerHTML = "";
            for (let i = 0; i < split.length - 1; ++i) {
                innerHTML += split[i] + "<strong>" + query + "</strong>";
            }
            innerHTML += split.last();
            const el = createDiv();
            el.innerHTML = innerHTML;
            return el;
        });
    }

    renderSuggestion(value: HTMLElement, el: HTMLElement): void {
        el.innerHTML = value.innerHTML;
    }

    selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}