import { EngineOptions, GraphViewData } from "../views/viewData";
import { DEFAULT_VIEW_ID } from "../globalVariables";

export interface ExtendedGraphSettings {
    colormaps: { [interactive: string] : string };
    interactiveColors: {[interactive: string]: {type: string, color: string}[]};
    unselectedInteractives: {[interactive: string]: string[]};
    noneType: { [interactive: string] : string };
    additionalProperties: { [interactive: string] : boolean };
    imageProperty: string;
    maxNodes: number;
    globalFilter: string;
    backupGraphOptions: EngineOptions;
    views: GraphViewData[];

    enableTags: boolean;
    enableProperties: boolean;
    enableLinks: boolean;
    enableImages: boolean;
    enableFocusActiveNote: boolean;

    fadeOnDisable: boolean;
    focusScaleFactor: number;

    // NOT SET BY THE USER
    collapseView: boolean;
    collapseLegend: boolean;
}

export const DEFAULT_SETTINGS: Partial<ExtendedGraphSettings> = {
    colormaps: {
        "tag": "hsv",
        "link": "rainbow"
    },
    interactiveColors: {
        "tag": [],
        "link": []
    },
    unselectedInteractives: {
        "tag": [],
        "link": []
    },
    noneType: {
        "tag": "none",
        "link": "none"
    },
    additionalProperties: {},
    imageProperty: "image",
    maxNodes: 20,
    globalFilter: "",

    backupGraphOptions: new EngineOptions(),
    views: [
        {
            id: DEFAULT_VIEW_ID,
            name: "Vault (default)",
            engineOptions: new EngineOptions(),
            disabledTypes: {
                "tag": [],
                "link": []
            }
        }
    ],

    enableTags: true,
    enableProperties: false,
    enableLinks: true,
    enableImages: true,
    enableFocusActiveNote: false,

    fadeOnDisable: false,
    focusScaleFactor: 1.8,

    collapseView: true,
    collapseLegend: true,
};

