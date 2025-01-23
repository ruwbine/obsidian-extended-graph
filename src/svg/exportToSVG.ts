
import { Graph } from "../graph/graph";
import { getSVGNode, polar2Cartesian } from "src/helperFunctions";
import { ExtendedGraphNode } from "../graph/extendedElements/extendedGraphNode";
import { int2hex, rgb2hex } from "src/colors/colors";
import { ExtendedGraphLink, getLinkID } from "../graph/extendedElements/extendedGraphLink";
import { App, HexString } from "obsidian";
import { GraphEngine, GraphLink, GraphNode, GraphRenderer } from "obsidian-typings";
import { ExportSVGOptionModal, ExportSVGOptions } from "./exportSVGOptionsModal";
import { NodeShape } from "src/graph/graphicElements/nodes/shapes";
import { ArcsCircle } from "src/graph/graphicElements/nodes/arcsCircle";

export abstract class ExportGraphToSVG {
    app: App;
    svg: SVGSVGElement;
    renderer: GraphRenderer;

    groupLinks: SVGElement;
    groupNodes: SVGElement;
    groupText: SVGElement;
    
    left: number;
    right: number;
    top: number;
    bottom: number;

    options: ExportSVGOptions;

    constructor(app: App, renderer: GraphRenderer) {
        this.app = app;
        this.renderer = renderer;
    }

    protected createSVG(options: ExportSVGOptions) {
        this.options = options;
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        
        this.svg.setAttributeNS(null, 'viewBox', this.getViewBox());

        this.groupLinks = getSVGNode('g', {id: 'links'});
        this.groupNodes = getSVGNode('g', {id: 'nodes'});
        this.groupText = getSVGNode('g', {id: 'texts'});

        this.addLinks();
        this.addNodes();

        this.svg.appendChild(this.groupLinks);
        this.svg.appendChild(this.groupNodes);
        this.svg.appendChild(this.groupText);
    }

    private addNodes(): void {
        const visibleNodes = this.getVisibleNodes();
        for (const node of visibleNodes) {
            const shape = this.getSVGForNode(node);
            if (!shape) continue;
            this.groupNodes.appendChild(shape);

            const text = this.getSVGForText(node);
            if (text) this.groupText.appendChild(text);
        }
    }

    private addLinks(): void {
        const visibleLinks = this.getVisibleLinks();
        for (const extendedLink of visibleLinks) {
            const link = this.getSVGForLink(extendedLink);
            if (!link) continue;
            this.groupLinks.appendChild(link);
        }
    }

    protected isNodeInVisibleArea(node: GraphNode): boolean {
        if (!this.options.onlyVisibleArea) return true;
        const viewport = structuredClone(this.renderer.viewport);
        const size = node.getSize();
        return node.x + size >= viewport.left
            && node.x - size <= viewport.right
            && node.y + size >= viewport.top
            && node.y - size <= viewport.bottom;
    }

    protected isLinkInVisibleArea(link: GraphLink): boolean {
        if (!this.options.onlyVisibleArea) return true;
        return this.isNodeInVisibleArea(link.source) && this.isNodeInVisibleArea(link.target);
    }

    private getSVGForText(node: ExtendedGraphNode | GraphNode): SVGElement | null {
        if (!this.options.showNodeNames) return null;

        const coreNode = this.getCoreNode(node);
        const fontSize = 20;

        const text = getSVGNode('text', {
            class: 'node-name',
            id: 'text:' + node.id,
            x: coreNode.x,
            y: coreNode.y + coreNode.getSize() + fontSize + 4,
            style: `font-size: ${fontSize}px;`,
            'text-anchor': "middle"
        });
        text.textContent = coreNode.getDisplayText();

        return text;
    }

    private getViewBox(): string {
        this.left = Infinity;
        this.right = -Infinity;
        this.top = Infinity;
        this.bottom = -Infinity;

        if (this.options.onlyVisibleArea) {
            const viewport = this.renderer.viewport;
            this.left   = viewport.left;
            this.right  = viewport.right;
            this.top    = viewport.top;
            this.bottom = viewport.bottom;
        }
        else {
            const visibleNodes = this.getVisibleNodes();
            for (const node of visibleNodes) {
                const coreNode = this.getCoreNode(node);
                const size = coreNode.getSize();
                if (coreNode.x - size < this.left)   this.left   = coreNode.x - size;
                if (coreNode.x + size > this.right)  this.right  = coreNode.x + size;
                if (coreNode.y - size < this.top)    this.top    = coreNode.y - size;
                if (coreNode.y + size > this.bottom) this.bottom = coreNode.y + size;
            }
            if (visibleNodes.length === 0) {
                this.left   = 0;
                this.right  = 0;
                this.top    = 0;
                this.bottom = 0;
            }
        }

        return `${this.left} ${this.top} ${this.right - this.left} ${this.bottom - this.top}`;
    }

    private getCoreNode(node: ExtendedGraphNode | GraphNode): GraphNode {
        return ('coreElement' in node) ? node.coreElement : node;
    }

    async toClipboard(): Promise<void> {
        try {
            const modal: ExportSVGOptionModal = this.getModal();

                modal.onClose = (async function() {
                    if (modal.isCanceled) return;

                    // Create SVG
                    this.createSVG(modal.options);
                    const svgString = this.toString();
                    
                    // Copy SVG as Image
                    if (modal.options.asImage) {
                        const blob = new Blob([svgString], {type: "image/svg+xml"});
                        await navigator.clipboard.write([
                            new ClipboardItem({
                                "image/svg+xml": blob
                            }),
                        ]);
                    }
                    // Copy SVG as text
                    else {
                        await navigator.clipboard.writeText(svgString);
                    }

                    new Notice("SVG copied to clipboard");
                }).bind(this);
                
                modal.open();
        } catch (err) {
            console.error(err.name, err.message);
        }
    }

    private toString(): string {
        const s = new XMLSerializer();
        return s.serializeToString(this.svg);
    }

    protected abstract getSVGForNode(node: ExtendedGraphNode | GraphNode): SVGElement;
    protected abstract getSVGForLink(link: ExtendedGraphLink | GraphLink): SVGElement;
    protected abstract getVisibleLinks(): ExtendedGraphLink[] | GraphLink[];
    protected abstract getVisibleNodes(): ExtendedGraphNode[] | GraphNode[];
    protected abstract getModal(): ExportSVGOptionModal;
}

export class ExportExtendedGraphToSVG extends ExportGraphToSVG {
    graph: Graph;

    constructor(app: App, graph: Graph) {
        super(app, graph.renderer);
        this.graph = graph;
    }

    protected override getSVGForNode(extendedNode: ExtendedGraphNode): SVGElement {
        const group = getSVGNode('g', {
            class: 'node-group',
            id: 'node:' + extendedNode.id
        });

        const nodeShape = this.getSVGForNodeShape(extendedNode);
        group.appendChild(nodeShape);

        if (this.options.showArcs) {
            const arcs = this.getSVGForArcs(extendedNode);
            group.appendChild(arcs);
        }

        return group;
    }

    private getSVGForNodeShape(extendedNode: ExtendedGraphNode): SVGElement {
        const node = extendedNode.coreElement;
        const size = node.getSize();
        if (this.options.useNodesShapes && extendedNode.graphicsWrapper) {
            const g = getSVGNode('g', {
                class: 'node-shape',
                transform: `translate(${node.x - size} ${node.y - size}) scale(${size / NodeShape.RADIUS})`,
                fill: int2hex(node.getFillColor().rgb)
            });
            const shape = NodeShape.getInnerSVG(extendedNode.graphicsWrapper?.shape);
            g.appendChild(shape);
            return g;
        }
        else {
            const circle = getSVGNode('circle', {
                class: 'node-shape',
                cx: node.x,
                cy: node.y,
                r: size,
                fill: int2hex(node.getFillColor().rgb)
            });
            return circle;
        }
    }

    private getSVGForArcs(extendedNode: ExtendedGraphNode): SVGElement {
        const node = extendedNode.coreElement;
        const size = node.getSize();
        const cx = node.x;
        const cy = node.y;

        const group = getSVGNode('g', {
            class: 'arcs'
        });

        for (const [key, manager] of extendedNode.managers) {
            const arcs = extendedNode.graphicsWrapper?.managerGraphicsMap?.get(key);
            if (!arcs) continue;

            const circleGroup = getSVGNode('g', {
                class: 'arcs-circle'
            });
            
            for (const [type, arc] of arcs.graphics) {
                const color: HexString = rgb2hex(manager.getColor(type));
                
                const alpha      = arc.graphic.alpha;
                const radius     = size * (0.5 + (ArcsCircle.thickness + ArcsCircle.inset) * arcs.circleLayer) * 2 * NodeShape.getSizeFactor(arcs.shape);
                const startAngle = arcs.arcSize * arc.index + ArcsCircle.gap * 0.5;
                const endAngle   = arcs.arcSize * (arc.index + 1) - ArcsCircle.gap * 0.5;
                const thickness  = size * ArcsCircle.thickness * 2 * NodeShape.getSizeFactor(arcs.shape);
                
                var start = polar2Cartesian(cx, cy, radius, endAngle);
                var end = polar2Cartesian(cx, cy, radius, startAngle);
                var largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

                const path = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
                const arcSVG = getSVGNode('path', {
                    class: 'arc arc-' + type,
                    d: path,
                    opacity: alpha,
                    'stroke-width': thickness,
                    'stroke': color,
                    'fill': 'none',
                });
                circleGroup.appendChild(arcSVG);
            }

            group.appendChild(circleGroup);
        }

        return group;
    }

    protected override getSVGForLink(extendedLink: ExtendedGraphLink): SVGElement {
        const link = extendedLink.coreElement;

        let path: string;
        if (this.options.useCurvedLinks) {
            const P0 = { x: link.source.x, y: link.source.y };
            const P2 = { x: link.target.x, y: link.target.y };
            const N = {x: -(P2.y - P0.y), y: (P2.x - P0.x)};
            const M = {x: (P2.x + P0.x) * 0.5, y: (P2.y + P0.y) * 0.5};
            const P1 = { x: M.x + 0.25 * N.x, y: M.y + 0.25 * N.y };

            path = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P2.x} ${P2.y}`;
        }
        else {
            path = `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`;
        }
        const color: HexString = extendedLink.graphicsWrapper ? rgb2hex(extendedLink.graphicsWrapper.pixiElement.color) : int2hex(Number(link.line.tint));
        const width: number = (this.graph.engine.options.lineSizeMultiplier ?? 1) * 4;
        const opacity: number = extendedLink.graphicsWrapper ? extendedLink.graphicsWrapper.pixiElement.targetAlpha : link.line.alpha;
        const line = getSVGNode('path', {
            class: 'link',
            id: 'link:' + getLinkID(link),
            d: path,
            stroke: color,
            'stroke-width': width,
            opacity: opacity,
            fill: 'none',
        });

        return line;
    }

    protected override getVisibleNodes(): ExtendedGraphNode[] {
        return [...this.graph.nodesSet.extendedElementsMap.values()].filter(n =>
            this.graph.nodesSet.connectedIDs.has(n.id)
            && n.coreElement.rendered
            && this.isNodeInVisibleArea(n.coreElement)
        );
    }

    protected override getVisibleLinks(): ExtendedGraphLink[] {
        return [...this.graph.linksSet.extendedElementsMap.values()]
            .filter(l =>
                this.graph.linksSet.connectedIDs.has(l.id)
                && l.coreElement.rendered
                && l.coreElement.line.visible
                && this.isLinkInVisibleArea(l.coreElement)
            )
            .map(l => l as ExtendedGraphLink);
    }

    private createImageName(): string {
        const viewName = this.graph.dispatcher.graphsManager.viewsManager.getViewDataById(this.graph.dispatcher.viewsUI.currentViewID);
        const timestamp = window.moment().format("YYYYMMDDHHmmss");
        return `graph${viewName ? '-' + viewName : ''}-${timestamp}.svg`;
    }

    protected getModal(): ExportSVGOptionModal {
        return new ExportSVGOptionModal(this.app, this.graph);
    }
}

export class ExportCoreGraphToSVG extends ExportGraphToSVG {
    engine: GraphEngine;

    constructor(app: App, engine: GraphEngine) {
        super(app, engine.renderer);
        this.engine = engine;
    }

    protected override getSVGForNode(node: GraphNode): SVGElement {
        const circle = getSVGNode('circle', {
            class: 'node-shape',
            id: 'node:' + node.id,
            cx: node.x,
            cy: node.y,
            r: node.getSize(),
            fill: int2hex(node.getFillColor().rgb)
        });

        return circle;
    }

    protected override getSVGForLink(link: GraphLink): SVGElement {
        const path: string = `M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`;
        const color: HexString = int2hex(Number(link.line.tint));
        const width: number = (this.engine.options.lineSizeMultiplier ?? 1) * 4;
        const opacity: number = link.line.alpha;
        const line = getSVGNode('path', {
            class: 'link',
            id: 'link:' + getLinkID(link),
            d: path,
            stroke: color,
            'stroke-width': width,
            opacity: opacity
        });

        return line;
    }

    protected override getVisibleNodes(): GraphNode[] {
        return this.renderer.nodes.filter(n => n.rendered && this.isNodeInVisibleArea(n));
    }

    protected override getVisibleLinks(): GraphLink[] {
        return this.renderer.links.filter(l => l.rendered && l.line.visible && this.isLinkInVisibleArea(l));
    }

    protected getModal(): ExportSVGOptionModal {
        return new ExportSVGOptionModal(this.app);
    }
}