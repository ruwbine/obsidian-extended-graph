import { App, TFile } from "obsidian";
import eccentricity from "graphology-metrics/node/eccentricity";
import { GraphologySingleton } from "./graphology";
import { NodeSizeCalculator } from "src/internal";

export class EccentricityCalculator extends NodeSizeCalculator {

    constructor(app: App) {
        super(app);
    }

    override async getSize(file: TFile): Promise<number> {
        const connectedGraph = GraphologySingleton.getConnectedGraphology(this.app, file.path);
        return eccentricity(connectedGraph, file.path);
    }

    override getLink(): string {
        return "https://en.wikipedia.org/wiki/Closeness_centrality";
    }
}