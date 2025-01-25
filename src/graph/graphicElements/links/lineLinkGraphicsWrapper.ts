import { LinkLineGraphics } from "./line";
import { InteractiveManager } from "src/graph/interactiveManager";
import { LinkGraphicsWrapper } from "./linkGraphicsWrapper";
import { GraphLink } from "obsidian-typings";
import { Graphics } from "pixi.js";

export class LineLinkGraphicsWrapper extends LinkGraphicsWrapper<LinkLineGraphics> {

    // ============================= INITALIZATION =============================
    
    override createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const lineLink = new LinkLineGraphics(manager, types, this.name);
        this.setManagerGraphics(manager, lineLink);
    }

    // ========================== CONNECT/DISCONNECT ===========================

    override connect(): void {
        if (this.extendedElement.coreElement.line && !this.extendedElement.coreElement.line.getChildByName(this.pixiElement.name)) {
            this.extendedElement.coreElement.line.addChild(this.pixiElement);
        }
    }
}