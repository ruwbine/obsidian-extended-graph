import { App, TFile } from "obsidian";
import { ExtendedGraphSettings, NodeStat, NodeStatCalculator } from "src/internal";

export class ForwardlinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(app: App, settings: ExtendedGraphSettings, stat: NodeStat, countDuplicates: boolean) {
        super(app, settings, stat);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(file: TFile): Promise<number> {
        const links = this.app.metadataCache.resolvedLinks[file.path];
        if (this.countDuplicates) {
            return Object.values(links).reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0);
        }
        return Object.keys(links).length;
    }
}