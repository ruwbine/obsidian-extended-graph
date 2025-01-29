import { GraphColorAttributes, GraphNode } from "obsidian-typings";
import { ExtendedGraphNode, FileNodeGraphicsWrapper, GraphInstances, InteractiveManager, NodeShape, PluginInstances, ShapeEnum } from "src/internal";


export class ExtendedGraphFileNode extends ExtendedGraphNode {
    graphicsWrapper: FileNodeGraphicsWrapper;
    coreGetFillColor: (() => GraphColorAttributes) | undefined;
    
    constructor(instances: GraphInstances, node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        super(instances, node, types, managers);
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats'] && this.instances.settings.nodesColorFunction !== 'default') {
            this.changeGetFillColor();
        }
    }

    // ================================ UNLOAD =================================

    unload(): void {
        this.restoreGetFillColor();
        super.unload();
    }

    // =============================== GRAPHICS ================================
    
    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needBackground()
            || this.needImage()
            || this.needArcs();
    }

    public needImage(): boolean { return this.instances.settings.enableFeatures[this.instances.type]['images']; }
    
    public needBackground(): boolean {
        return this.instances.settings.enableFeatures[this.instances.type]['focus']
            || this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE;
    }
        
    public needArcs(): boolean {
        if (this.coreElement.type !== "" || this.managers.size === 0)
            return false;
        
        for (const [key, manager] of this.managers) {
            if (this.instances.settings.interactiveSettings[key].showOnGraph) {
                return true;
            }
        }

        return false;
    }
    
    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new FileNodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);

        let layer = 1;
        for (const [key, manager] of this.managers) {
            if (!this.instances.settings.interactiveSettings[key].showOnGraph) continue;
            const validTypes = this.getTypes(key);
            this.graphicsWrapper.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
    }

    // ============================== NODE COLOR ===============================
    
    private changeGetFillColor() {
        if (this.coreGetFillColor || !this.instances.settings.enableFeatures[this.instances.type]["elements-stats"] || this.instances.settings.nodesColorFunction === "default") {
            return;
        }
        this.coreGetFillColor = this.coreElement.getFillColor;
        const getFillColor = this.getFillColor.bind(this);
        this.coreElement.getFillColor = new Proxy(this.coreElement.getFillColor, {
            apply(target, thisArg, args) {
                return getFillColor.call(this, ...args) ?? target.call(thisArg, ...args);
            }
        });
    }

    private restoreGetFillColor() {
        if (!this.coreGetFillColor) return;
        this.coreElement.getFillColor = this.coreGetFillColor;
        this.coreGetFillColor = undefined;
    }

    private getFillColor(): GraphColorAttributes | undefined {
        const rgb = PluginInstances.graphsManager.nodeColorCalculator?.filesStats.get(this.id);
        if (!rgb) return undefined;
        return { rgb: rgb, a: 1 }
    }
}