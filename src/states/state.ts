import { EngineOptions, FOLDER_KEY, Graph, GraphInstances, GraphStateData, LINK_KEY, PluginInstances, TAG_KEY } from "src/internal";

export class GraphState {
    data = new GraphStateData();

    constructor(name: string) {
        this.data.name = name;
    }

    setID(id?: string) {
        this.data.id = id ? id : crypto.randomUUID();
    }

    saveGraph(instances: GraphInstances) {
        // Disable types
        this.data.toggleTypes = {};
        
        const linksManager = instances.linksSet.managers.get(LINK_KEY);
        this.data.toggleTypes[LINK_KEY] = linksManager?.getTypes()
            .filter(type => PluginInstances.settings.interactiveSettings[LINK_KEY].enableByDefault !== linksManager.isActive(type)) ?? [];

        const folderManager = instances.foldersSet.managers.get(FOLDER_KEY);
        this.data.toggleTypes[FOLDER_KEY] = folderManager?.getTypes()
            .filter(type => PluginInstances.settings.interactiveSettings[FOLDER_KEY].enableByDefault !== folderManager.isActive(type)) ?? [];

        for (const [key, manager] of instances.nodesSet.managers) {
            this.data.toggleTypes[key] = manager.getTypes()
                .filter(type => PluginInstances.settings.interactiveSettings[key].enableByDefault !== manager.isActive(type));
        }

        // Pinned nodes
        this.data.pinNodes = {};
        for (const [id, extendedNode] of instances.nodesSet.extendedElementsMap) {
            if (extendedNode.isPinned) {
                this.data.pinNodes[id] = {x: extendedNode.coreElement.x, y: extendedNode.coreElement.y};
            }
        }

        // Engine options
        this.data.engineOptions = new EngineOptions(instances.graph.engine.getOptions());
        this.data.engineOptions.search = instances.graph.engine.filterOptions.search.inputEl.value;
    }

    saveState(stateData: GraphStateData): boolean {
        this.data = stateData;
        return this.completeDefaultOptions();
    }

    isValidProperty(key: string) {
        return ['id', 'name', 'toggleTypes', 'pinNodes', 'engineOptions'].includes(key);
    }

    completeDefaultOptions(): boolean {
        let hasChanged = false;
        if (!this.data.toggleTypes) {
            this.data.toggleTypes = {};
            hasChanged = true;
        }
        if (!this.data.toggleTypes[TAG_KEY]) {
            this.data.toggleTypes[TAG_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.toggleTypes[LINK_KEY]) {
            this.data.toggleTypes[LINK_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.toggleTypes[FOLDER_KEY]) {
            this.data.toggleTypes[FOLDER_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.pinNodes) {
            this.data.pinNodes = {};
            hasChanged = true;
        }
        if (!this.data.engineOptions) {
            this.data.engineOptions = new EngineOptions();
            hasChanged = true;
        }

        for (const key in this.data) {
            if (!this.isValidProperty(key)) {
                delete (this.data as any)[key];
                hasChanged = true;
            }
        }

        return hasChanged;
    }
}