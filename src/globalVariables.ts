export const NONE_TYPE: string = "none";
export const NONE_COLOR: Uint8Array = new Uint8Array([125, 125, 125]);
export const DEFAULT_VIEW_ID: string = "default-vault";
export const FUNC_NAMES: boolean = false;
export const NODE_CIRCLE_RADIUS: number = 100;
export const NODE_CIRCLE_X: number = 100;
export const NODE_CIRCLE_Y: number = 100;
export const ARC_THICKNESS: number = 0.09;
export const ARC_INSET: number = 0.03;
export const INVALID_KEYS: {[interactive: string]: string[]} = {
    "tag": [NONE_TYPE],
    "link": ["tags", "file", NONE_TYPE],
}