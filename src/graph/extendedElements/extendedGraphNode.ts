import { App } from "obsidian";
import { GraphNode } from "obsidian-typings";
import { Graphics } from "pixi.js";
import { ExtendedGraphElement, ExtendedGraphSettings, getFile, getFileInteractives, GraphType, InteractiveManager, isNumber, NodeGraphicsWrapper, NodeShape, ShapeEnum } from "src/internal";
import ExtendedGraphPlugin from "src/main";

export abstract class ExtendedGraphNode extends ExtendedGraphElement<GraphNode> {
    app: App;
    graphicsWrapper?: NodeGraphicsWrapper;
    isPinned: boolean = false;

    // Size
    graphicsWrapperScale: number = 1;
    radius: number = NodeShape.RADIUS;
    coreGetSize?: () => number;

    // ============================== CONSTRUCTOR ==============================

    constructor(node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[], settings: ExtendedGraphSettings, graphType: GraphType, app: App) {
        super(node, types, managers, settings, graphType);
        this.app = app;

        this.initRadius();
        this.changeGetSize();
        this.initGraphicsWrapper();
        this.updateFontFamily();
    }

    // ================================ UNLOAD =================================

    unload() {
        this.restoreGetSize();
    }

    // =============================== GRAPHICS ================================

    protected needGraphicsWrapper(): boolean {
        return this.needPin() || this.needOpacityLayer();
    }
    
    public needOpacityLayer(): boolean { return this.settings.fadeOnDisable; }

    public needPin(): boolean { return true; }

    protected abstract createGraphicsWrapper(): void;

    // =============================== NODE SIZE ===============================

    private initRadius() {
        if (!this.settings.enableFeatures[this.graphType]['node-size']) return;

        const property = this.settings.nodeSizeProperty;
        if (!property || property === "") return;

        const file = getFile(this.app, this.id);
        if (!file) return;
        
        const values = getFileInteractives(property, this.app, file);
        for (const value of values) {
            if (isNumber(value)) {
                this.radius = parseInt(value);
                if (isNaN(this.radius)) this.radius = NodeShape.RADIUS;
                break;
            }
        }
    }
    
    private changeGetSize() {
        if (this.coreGetSize && (!this.graphicsWrapper || this.graphicsWrapper?.shape === ShapeEnum.CIRCLE)) {
            this.restoreGetSize();
            return;
        }
        else if (this.coreGetSize) {
            return;
        }
        this.coreGetSize = this.coreElement.getSize;
        const getSize = this.getSize.bind(this);
        this.coreElement.getSize = new Proxy(this.coreElement.getSize, {
            apply(target, thisArg, args) {
                return getSize.call(this, ...args)
            }
        });
    }

    private restoreGetSize() {
        if (!this.coreGetSize) return;
        this.coreElement.getSize = this.coreGetSize;
        this.coreGetSize = undefined;
    }

    getSize(): number {
        return this.getSizeWithoutScaling() * this.graphicsWrapperScale;
    }

    getSizeWithoutScaling(): number {
        const customRadiusFactor = this.radius / NodeShape.RADIUS;
        const node = this.coreElement;
        if (this.settings.enableFeatures[this.graphType]['node-size'] && this.settings.nodeSizeFunction !== 'default') {
            const originalSize = node.renderer.fNodeSizeMult * 8;
            let customFunctionFactor = (this.app.plugins.getPlugin('extended-graph') as ExtendedGraphPlugin).graphsManager.nodeSizeCalculator?.fileStats.get(this.id);
            return originalSize * customRadiusFactor * (customFunctionFactor ?? 1);
        }
        else {
            const originalSize = node.renderer.fNodeSizeMult * Math.max(8, Math.min(3 * Math.sqrt(node.weight + 1), 30));
            return originalSize * customRadiusFactor;
        }
    }

    // ============================== CORE ELEMENT =============================

    protected override isCoreElementUptodate(): boolean {
        return !!this.coreElement.circle;
    }

    override isSameCoreElement(node: GraphNode): boolean {
        return node.id === this.id;
    }

    override getCoreCollection(): GraphNode[] {
        return this.coreElement.renderer.nodes;
    }

    override setCoreElement(coreElement: GraphNode | undefined): void {
        super.setCoreElement(coreElement);
        if (coreElement) {
            this.updateFontFamily();
        }
    }

    protected override getCoreParentGraphics(coreElement: GraphNode): Graphics | null {
        return coreElement.circle;
    }

    protected override setCoreParentGraphics(coreElement: GraphNode): void {
        this.coreElement.circle = coreElement.circle;
    }

    updateFontFamily(): void {
        if (!this.coreElement.text) return;
        const style = window.getComputedStyle(this.coreElement.renderer.interactiveEl);
        const fontInterface = style.getPropertyValue("--font-interface");
        const fontNode = (typeof this.coreElement.text.style.fontFamily === "string")
            ? this.coreElement.text.style.fontFamily
            : this.coreElement.text.style.fontFamily.join(', ');
        if (fontNode !== fontInterface) {
            const textStyle = this.coreElement.text.style;
            textStyle.fontFamily = fontInterface;
            this.coreElement.text.style = textStyle;
            this.coreElement.text.dirty = true;
        }
    }

    // ================================ GETTERS ================================

    getID(): string {
        return this.coreElement.id;
    }

    // =============================== PIN NODES ===============================

    pin(): void {
        this.isPinned = true;
        this.graphicsWrapper?.pin();
    }

    unpin(): void {
        this.isPinned = false;
        this.graphicsWrapper?.unpin();
    }
}