import { Graph } from "src/graph/graph";
import { EngineOptions, GraphViewData } from "./viewData";
import { FOLDER_KEY, LINK_KEY } from "src/globalVariables";

export class GraphView {
    data = new GraphViewData();

    constructor(name: string) {
        this.data.name = name;
    }

    setID(id?: string) {
        this.data.id = id ? id : crypto.randomUUID();
    }

    saveGraph(graph: Graph) {
        // Disable types
        this.data.disabledTypes = {}; 
        this.data.disabledTypes[LINK_KEY] = graph.linksSet.linksManager ? graph.linksSet.linksManager.getTypes().filter(type => !graph.linksSet.linksManager?.isActive(type)): [];
        this.data.disabledTypes[FOLDER_KEY] = graph.folderBlobs.manager ? graph.folderBlobs.manager.getTypes().filter(type => !graph.folderBlobs.manager?.isActive(type)): [];
        for (const [key, manager] of graph.nodesSet.managers) {
            this.data.disabledTypes[key] = manager.getTypes().filter(type => !manager.isActive(type));
        }

        // Pinned nodes
        this.data.pinNodes = {};
        for (const [id, wrapper] of graph.nodesSet.nodesMap) {
            if (wrapper.isPinned) {
                this.data.pinNodes[id] = {x: wrapper.node.x, y: wrapper.node.y};
            }
        }

        // Engine options
        this.data.engineOptions = new EngineOptions(graph.engine.getOptions());
        this.data.engineOptions.search = graph.engine.filterOptions.search.inputEl.value;
    }
}