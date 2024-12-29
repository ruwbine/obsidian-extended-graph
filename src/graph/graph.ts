
import { Component } from 'obsidian';
import { Renderer } from './renderer';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { NodesSet } from './nodesSet';
import { LinksSet } from './linksSet';
import { DEFAULT_VIEW_ID, DisconnectionCause } from 'src/globalVariables';
import { GraphEventsDispatcher } from './graphEventsDispatcher';
import { ExtendedGraphSettings } from 'src/settings/settings';
import { getLinkID } from './elements/link';
import { getEngine } from 'src/helperFunctions';

export class Graph extends Component {
    nodesSet: NodesSet;
    linksSet: LinksSet;
    interactiveManagers = new Map<string, InteractiveManager>();
    hasChangedFilterSearch: boolean = false;

    dispatcher: GraphEventsDispatcher;
    engine: any;
    renderer: Renderer;
    settings: ExtendedGraphSettings;

    constructor(dispatcher: GraphEventsDispatcher) {
        super();
        this.dispatcher = dispatcher;
        this.renderer = dispatcher.leaf.view.renderer;
        this.settings = structuredClone(dispatcher.graphsManager.plugin.settings);

        // Initialize nodes and links sets
        let keys = Object.keys(this.settings.additionalProperties).filter(k => this.settings.additionalProperties[k]);
        if (this.settings.enableTags) keys = keys.concat(["tag"]);
        let managers: InteractiveManager[] = [];
        for (const key of keys) {
            let manager = new InteractiveManager(dispatcher, dispatcher.graphsManager.plugin.settings, key);
            this.interactiveManagers.set(key, manager);
            this.addChild(manager);
            managers.push(manager);
        }
        this.nodesSet = new NodesSet(this, managers);

        let linksManager = this.settings.enableLinks ? new InteractiveManager(dispatcher, dispatcher.graphsManager.plugin.settings, "link") : null;
        this.linksSet = new LinksSet(this, linksManager);
        if (linksManager) {
            this.interactiveManagers.set("link", linksManager);
            this.addChild(linksManager);
        }

        this.engine = getEngine(this.dispatcher.leaf);
        
        if (this.nodesSet?.disconnectedNodes) {
            this.engine.filterOptions.search.getValue = (function() {
                let prepend = this.dispatcher.graphsManager.plugin.settings.globalFilter + " ";
                return prepend + this.engine.filterOptions.search.inputEl.value;
            }).bind(this);
            this.hasChangedFilterSearch = true;
        }
    }

    onload() : void {
        this.initSets().then(() => {
            this.dispatcher.onGraphReady();
        }).catch(e => {
            console.error(e);
        });
    }

    onunload() : void {
        if (this.hasChangedFilterSearch) {
            this.engine.filterOptions.search.getValue = (function() {
                return this.filterOptions.search.inputEl.value;
            }).bind(this.engine);
        }
    }

    async initSets() : Promise<void> {
        // Sleep for a short duration to let time to the engine to apply user filters
        await new Promise(r => setTimeout(r, 1000));

        this.nodesSet.load();
        this.linksSet.load();

        // Update node opacity layer colors
        if (this.settings.fadeOnDisable) {
            this.nodesSet?.updateOpacityLayerColor();
        }
    }

    /**
     * Disables link types specified in the types array.
     * @param types - Array of link types to disable.
     * @returns boolean - True if links were found and disabled, otherwise false.
     */
    disableLinkTypes(types: string[]) : boolean {
        const links = this.linksSet.getLinks(types);
        if (links) {
            this.disableLinks(links);
            return true;
        }
        return false;
    }

    /**
     * Enables link types specified in the types array.
     * @param types - Array of link types to enable.
     * @returns boolean - True if links were found and enabled, otherwise false.
    */
    enableLinkTypes(types: string[]) : boolean {
        const links = this.linksSet.getLinks(types);
        if (links) {
            this.enableLinks(links);
            return true;
        }
        return false;
    }

    /**
     * Disables links specified by their IDs.
     * @param ids - Set of link IDs to disable.
     */
    disableLinks(ids: Set<string>) {
        this.linksSet.disableLinks(ids, DisconnectionCause.USER);
    }

    /**
     * Enables links specified by their IDs.
     * @param ids - Set of link IDs to enable.
     */
    enableLinks(ids: Set<string>) {
        this.linksSet.enableLinks(ids, DisconnectionCause.USER);
    }

    /**
     * Finds links to disable based on the provided disabled node IDs.
     * @param nodeIds - Set of disabled node IDs.
     * @returns Set<string> - Set of link IDs to disable.
     */
    findLinksToDisable(nodeIds: Set<string>) : Set<string> {
        let linksToDisable = new Set<string>();
        for (const id of nodeIds) {
            let node = this.nodesSet.nodesMap.get(id)?.node;
            if (!node) continue;
            for (const forward in node.forward) {
                const linkID = getLinkID({source: {id: id}, target: {id: forward}});
                this.linksSet.connectedLinks.has(linkID) && linksToDisable.add(linkID);
            }
            for (const reverse in node.reverse) {
                const linkID = getLinkID({source: {id: reverse}, target: {id: id}});
                this.linksSet.connectedLinks.has(linkID) && linksToDisable.add(linkID);
            }
        }
        return linksToDisable;
    }

    /**
     * Finds links to enable based on the provided enabled node IDs and cause.
     * @param nodeIds - Set of enabled node IDs.
     * @param cause - The cause for the disconnection.
     * @returns Set<string> - Set of link IDs to enable.
     */
    findLinksToEnable(nodeIds: Set<string>, cause: string) : Set<string> {
        let linksToEnable = new Set<string>();
        for (const id of nodeIds) {
            let node = this.nodesSet.nodesMap.get(id)?.node;
            if (!node) continue;
            for (const forward in node.forward) {
                const linkID = getLinkID({source: {id: id}, target: {id: forward}});
                this.linksSet.disconnectedLinks[cause].has(linkID) && linksToEnable.add(linkID);
            }
            for (const reverse in node.reverse) {
                const linkID = getLinkID({source: {id: reverse}, target: {id: id}});
                this.linksSet.disconnectedLinks[cause].has(linkID) && linksToEnable.add(linkID);
            }
        }
        return linksToEnable;
    }

    /**
     * Disables nodes specified by their IDs and cascades the disconnection to related links.
     * @param ids - Array of node IDs to disable.
     */
    disableNodes(ids: string[]) {
        this.nodesSet.disableNodes(ids, DisconnectionCause.USER);

        let linksToDisable = this.findLinksToDisable(new Set<string>(ids));
        this.linksSet.disableLinks(linksToDisable, DisconnectionCause.NODE_CASCADE);
    }

    /**
     * Enables nodes specified by their IDs and cascades the reconnection to related links.
     * @param ids - Array of node IDs to enable.
     */
    enableNodes(ids: string[]) {
        this.nodesSet.enableNodes(ids, DisconnectionCause.USER);

        let linksToEnable = this.findLinksToEnable(new Set<string>(ids), DisconnectionCause.NODE_CASCADE);
        this.linksSet.enableLinks(linksToEnable, DisconnectionCause.NODE_CASCADE);
    }
        
    /**
     * Updates the worker with the current state of nodes and links.
     */
    updateWorker() : void {
        let nodes: { [node: string] : number[]} = {};
        for (const id of this.nodesSet.connectedNodes) {
            let wrapper = this.nodesSet.nodesMap.get(id);
            (wrapper) && (nodes[id] = [wrapper.node.x, wrapper.node.y]);
        }

        let links: any[] = [];
        for (const id of this.linksSet.connectedLinks) {
            const l = this.linksSet.linksMap.get(id);
            (l) && links.push([l.link.source.id, l.link.target.id]);
        }

        this.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: .3,
            run: !0
        });
    }

    /**
     * Creates a new view with the specified name from the current graph.
     * @param name - The name of the new view.
     * @returns string - The ID of the new view.
     */
    newView(name: string) : string {
        let view = new GraphView(name);
        view.setID();
        view.saveGraph(this);
        this.dispatcher.graphsManager.onViewNeedsSaving(view.data);
        return view.data.id;
    }

    /**
     * Saves the current graph in the view with the specified ID.
     * @param id - The ID of the view to save.
     */
    saveView(id: string) : void {
        if (id === DEFAULT_VIEW_ID) return;
        let viewData = this.settings.views.find(v => v.id == id);
        if (!viewData) return;
        let view = new GraphView(viewData?.name);
        view.setID(id);
        view.saveGraph(this);
        this.dispatcher.graphsManager.onViewNeedsSaving(view.data);
    }
}
