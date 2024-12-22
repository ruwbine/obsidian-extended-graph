import { App, Component, EventRef, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "./ui/legendUI";
import { GraphViewsUI } from "./ui/viewsUI";
import { Renderer } from "./renderer";
import { DEFAULT_VIEW_ID, FUNC_NAMES } from "src/globalVariables";
import { GraphsManager } from "src/graphsManager";
import { GraphControlsUI } from "./ui/graphControl";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:disable-plugin",   callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:enable-plugin",    callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:add-tag-types",    callback: (colorsMap: Map<string, Uint8Array>) => any) : EventRef;
    on(name: "extended-graph:remove-tag-types", callback: (types: Set<string>) => any)                 : EventRef;
    on(name: "extended-graph:clear-tag-types",  callback: (types: string[]) => any)                    : EventRef;
    on(name: "extended-graph:change-tag-color", callback: (type: string, color: Uint8Array) => any)    : EventRef;
    on(name: "extended-graph:disable-tags",     callback: (type: string[]) => any)                     : EventRef;
    on(name: "extended-graph:enable-tags",      callback: (type: string[]) => any)                     : EventRef;
    on(name: "extended-graph:add-link-types",    callback: (colorsMap: Map<string, Uint8Array>) => any) : EventRef;
    on(name: "extended-graph:remove-link-types", callback: (types: Set<string>) => any)                 : EventRef;
    on(name: "extended-graph:clear-link-types",  callback: (types: string[]) => any)                    : EventRef;
    on(name: "extended-graph:change-link-color", callback: (type: string, color: Uint8Array) => any)    : EventRef;
    on(name: "extended-graph:disable-links",     callback: (type: string[]) => any)                     : EventRef;
    on(name: "extended-graph:enable-links",      callback: (type: string[]) => any)                     : EventRef;

    view: {
        renderer: Renderer
    }
}

export class GraphEventsDispatcher extends Component {
    type: string;
    animationFrameId: number | null = null;
    stopAnimation: boolean = true;

    graphsManager: GraphsManager;
    leaf: WorkspaceLeafExt;
    
    graph: Graph;
    legendUI: LegendUI | null = null;
    viewsUI: GraphViewsUI;
    controlsUI: GraphControlsUI;

    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] new");
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;

        this.graph = new Graph(this);
        this.addChild(this.graph);

        this.controlsUI = new GraphControlsUI(this);
        this.addChild(this.controlsUI);
        this.viewsUI = new GraphViewsUI(this);
        this.addChild(this.viewsUI);
        if (this.graphsManager.plugin.settings.enableLinks || this.graphsManager.plugin.settings.enableTags) {
            this.legendUI = new LegendUI(this);
            this.addChild(this.legendUI);
        }
        this.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
    }

    onload(): void {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onload");

        if (this.graphsManager.plugin.settings.enableTags) {
            this.registerEvent(this.leaf.on('extended-graph:add-tag-types', this.onTagTypesAdded.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:remove-tag-types', this.onTagTypesRemoved.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:clear-tag-types', this.onTagsCleared.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:change-tag-color', this.onTagColorChanged.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:disable-tags', this.onTagsDisabled.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:enable-tags', this.onTagsEnabled.bind(this)));
        }
        
        if (this.graphsManager.plugin.settings.enableLinks) {
            this.registerEvent(this.leaf.on('extended-graph:add-link-types', this.onLinkTypesAdded.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:remove-link-types', this.onLinkTypesRemoved.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:clear-link-types', this.onLinksCleared.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:change-link-color', this.onLinkColorChanged.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:disable-links', this.onLinksDisabled.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:enable-links', this.onLinksEnabled.bind(this)));
        }

        this.onViewChanged(DEFAULT_VIEW_ID);

        this.startUpdateFrame();
    }

    onunload(): void {
        this.stopAnimation = true;
        this.leaf.view.renderer.px.stage.children[1].removeAllListeners();
        this.leaf.view.renderer.worker.removeEventListener("message", this.startUpdateFrame.bind(this));
    }

    onGraphReady() : void {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onGraphReady");
        this.leaf.view.renderer.px.stage.children[1].on('childAdded', (e: any) => {
            this.updateFromEngine();
        });
        this.leaf.view.renderer.px.stage.children[1].on('childRemoved', (e: any) => {
            this.updateFromEngine();
        });

        if (this.graph.settings.linkCurves) {
            this.leaf.view.renderer.worker.addEventListener("message", this.startUpdateFrame.bind(this));
            this.leaf.view.renderer.px.stage.addEventListener("wheel", this.startUpdateFrame.bind(this));
            //this.leaf.view.renderer.px.stage.addEventListener("re")
        }

        this.graph.test();
    }

    // UPDATES

    private updateFromEngine() {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] updateFromEngine");
        if (this.leaf.view.renderer.nodes.length > this.graphsManager.plugin.settings.maxNodes) {
            this.leaf.trigger("extended-graph:disable-plugin", this.leaf);
            return;
        }

        if (this.graph.nodesSet)
            this.graph.nodesSet.updateNodesFromEngine();
        if (this.graph.linksSet)
            this.graph.linksSet.updateLinksFromEngine();

        this.startUpdateFrame();
    }

    onEngineNeedsUpdate() {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onEngineNeedsUpdate");
        this.graph.updateWorker();
    }

    onGraphNeedsUpdate() {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onGraphNeedsUpdate");
        if (this.graphsManager.plugin.settings.enableTags && this.graph.nodesSet) {
            this.graph.initSets().then(() => {
                this.graph.nodesSet?.resetArcs();
            });
        }
    }

    startUpdateFrame() {
        if (!this.stopAnimation) return;
        this.stopAnimation = false;
        requestAnimationFrame(this.updateFrame.bind(this));
    }

    updateFrame() {
        this.stopAnimation = (this.stopAnimation)
            || (this.graph.renderer.idleFrames > 60)
            || (!this.graph.linksSet);

        if (this.stopAnimation) {
            return;
        }
        if (this.graph.linksSet) {
            for(const [id, linkWrapper] of this.graph.linksSet?.linksMap) {
                linkWrapper.updateGraphics();
            }
        }
        this.animationFrameId = requestAnimationFrame(this.updateFrame.bind(this));
    }

    // TAGS

    onTagTypesAdded(colorMaps: Map<string, Uint8Array>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagTypesAdded");
        this.graph.nodesSet?.resetArcs();
        colorMaps.forEach((color, type) => {
            this.legendUI?.addLegend("tag", type, color);
        });
        this.leaf.view.renderer.changed();
    }

    onTagTypesRemoved(types: Set<string>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagTypesRemoved");
        this.legendUI?.removeLegend("tag", [...types]);
    }

    onTagsCleared(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagsCleared");
        this.graph.nodesSet?.removeArcs(types);
        this.legendUI?.removeLegend("tag", types);
        this.leaf.view.renderer.changed();
    }

    onTagColorChanged(type: string, color: Uint8Array) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagColorChanged");
        this.graph.nodesSet?.updateArcsColor(type, color);
        this.legendUI?.updateLegend("tag", type, color);
        this.leaf.view.renderer.changed();
    }

    onTagsDisabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagsDisabled");
        types.forEach(type => {
            this.graph.nodesSet?.disableTag(type);
        });
        this.leaf.view.renderer.changed();
    }

    onTagsEnabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagsEnabled");
        types.forEach(type => {
            this.graph.nodesSet?.enableTag(type);
        });
        this.leaf.view.renderer.changed();
    }

    // LINKS


    onLinkTypesAdded(colorMaps: Map<string, Uint8Array>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinkTypesAdded");
        colorMaps.forEach((color, type) => {
            this.graph.linksSet?.updateLinksColor(type, color);
            this.legendUI?.addLegend("link", type, color);
        });
        this.leaf.view.renderer.changed();
    }

    onLinkTypesRemoved(types: Set<string>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinkTypesRemoved");
        this.legendUI?.removeLegend("link", [...types]);
    }

    onLinksCleared(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinksCleared");
        //this.graph.resetArcs();
        this.legendUI?.removeLegend("link", types);
        this.leaf.view.renderer.changed();
    }

    onLinkColorChanged(type: string, color: Uint8Array) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinkColorChanged");
        this.graph.linksSet?.updateLinksColor(type, color);
        this.legendUI?.updateLegend("link", type, color);
        this.leaf.view.renderer.changed();
    }

    onLinksDisabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinksDisabled");
        this.graph.disableLinkTypes(types);
        this.leaf.view.renderer.changed();
    }

    onLinksEnabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinksEnabled");
        this.graph.enableLinkTypes(types);
        this.leaf.view.renderer.changed();
    }

    // VIEWS

    onViewChanged(id: string) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onViewChanged");
        const viewData = this.graphsManager.plugin.settings.views.find(v => v.id === id);
        if (!viewData) return;

        if (this.graph.nodesSet && this.graph.nodesSet.tagsManager) {
            this.graph.nodesSet.tagsManager.loadView(viewData);
            this.legendUI?.enableAll("tag");
            viewData.disabledTags.forEach(type => {
                this.legendUI?.disable("tag", type);
            });
        }

        if (this.graph.linksSet) {
            this.graph.linksSet.linksManager.loadView(viewData);
            this.legendUI?.enableAll("link");
            viewData.disabledLinks.forEach(type => {
                this.legendUI?.disable("link", type);
            });
        }

        this.graph.setEngineOptions(viewData.engineOptions);
    }
}