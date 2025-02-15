import { TFile } from "obsidian";
import { getColor, PluginInstances, rgb2int } from "src/internal";
import STRINGS from "src/Strings";

export type NodeStatFunction = 'default' | 'backlinksCount' | 'forwardlinksCount' | 'forwardUniquelinksCount' | 'filenameLength' | 'tagsCount' | 'creationTime' | 'modifiedTime' | 'betweenness' | 'closeness' | 'eccentricity' | 'degree' | 'eigenvector' | 'hub' | 'authority';

export const nodeStatFunctionLabels: Record<NodeStatFunction, string> = {
    'default': STRINGS.plugin.default,
    'backlinksCount': STRINGS.statsFunctions.backlinksCount,
    'forwardlinksCount': STRINGS.statsFunctions.forwardlinksCount,
    'forwardUniquelinksCount': STRINGS.statsFunctions.forwardUniquelinksCount,
    'filenameLength': STRINGS.statsFunctions.filenameLength,
    'tagsCount': STRINGS.statsFunctions.tagsCount,
    'creationTime': STRINGS.statsFunctions.creationTime,
    'modifiedTime': STRINGS.statsFunctions.modifiedTime,
    'eccentricity': STRINGS.statsFunctions.eccentricity,
    'betweenness': STRINGS.statsFunctions.betweenness,
    'closeness': STRINGS.statsFunctions.closeness,
    'degree': STRINGS.statsFunctions.degree,
    'eigenvector': STRINGS.statsFunctions.eigenvector,
    'hub': STRINGS.statsFunctions.hub,
    'authority': STRINGS.statsFunctions.authority,
}

export type NodeStat = 'size' | 'color';

export abstract class NodeStatCalculator {
    filesStats: Map<string, {measure: number, value: number}>;
    stat: NodeStat;

    constructor(stat: NodeStat) {
        this.stat = stat;
    }

    async computeStats(): Promise<void> {
        await this.getStats();
        this.mapStat();
        console.log(this.filesStats);
    }

    private async getStats(): Promise<void> {
        this.filesStats = new Map<string, {measure: number, value: number}>();
        const files = PluginInstances.app.vault.getMarkdownFiles();
        for (const file of files) {
            this.getStat(file).then(size => this.filesStats.set(file.path, {measure: size, value: 0}));
        }
    }

    mapStat(): void {
        switch (this.stat) {
            case 'size':
                this.normalizeValues(0.5, 1.5);
                this.cleanNanAndInfiniteValues(1);
                break;

            case 'color':
                this.normalizeValues(0, 100);
                this.cleanNanAndInfiniteValues(50);
                this.filesStats.forEach(({measure, value}, path) => {
                    this.filesStats.set(path, {measure: measure, value: rgb2int(getColor(PluginInstances.settings.nodesColorColormap, value / 100))});
                });
                break;
        
            default:
                break;
        }
    }

    private normalizeValues(from: number, to: number): void {
        const N = this.getMeasures();
        const min = Math.min(...N);
        const max = Math.max(...N);
        this.filesStats.forEach(({measure, value}, path) => {
            this.filesStats.set(path, {measure: measure, value: (to - from) * (measure - min) / (max - min) + from});
        });
    }

    private getMeasures(): number[] {
        return [...this.filesStats.values()].map(({measure, value}) => measure).filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfiniteValues(defaultValue: number) {
        this.filesStats.forEach(({measure, value}, path) => {
            if (!isFinite(value) || isNaN(value)) {
                this.filesStats.set(path, {measure: measure, value: defaultValue});
            }
        });
    }

    abstract getStat(file: TFile): Promise<number>;

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}