import { DEFAULT_STATE_ID, EngineOptions, Feature, GraphStateData, GraphType, LinkStatFunction, NodeStatFunction, QueryData } from "src/internal";


type InteractiveSettings = {
    colormap: string;
    colors: {type: string, color: string}[];
    unselected: string[];
    noneType: string;
    showOnGraph: boolean;
    enableByDefault: boolean;
}

export type ExportSVGOptions = {
    asImage: boolean,
    // Core options
    onlyVisibleArea: boolean,
    showNodeNames: boolean,
    // Extended options
    useCurvedLinks: boolean,
    useNodesShapes: boolean,
    showArcs: boolean,
    showFolders: boolean,
}

export interface ExtendedGraphSettings {
    // Interactive settings
    interactiveSettings: { [interactive: string] : InteractiveSettings };
    additionalProperties: { [interactive: string] : boolean };

    // Graph settings
    backupGraphOptions: EngineOptions;
    states: GraphStateData[];

    // Image
    imageProperty: string;
    borderFactor: number;

    // Nodes sizes
    nodesSizeProperty: string;
    nodesSizeFunction: NodeStatFunction;
    // Nodes colors
    nodesColorColormap: string;
    nodesColorFunction: NodeStatFunction;
    // Links sizes
    linksSizeFunction: LinkStatFunction;
    // Links colors
    linksColorColormap: string;
    linksColorFunction: LinkStatFunction;

    // Zoom on node
    zoomFactor: number;

    // Performances
    maxNodes: number;
    delay: number;

    // Feature toggles
    enableFeatures: Record<GraphType, Record<Feature, boolean>>;

    // Shapes
    shapeQueries: Record<string, QueryData>;

    // Export SVG
    exportSVGOptions: ExportSVGOptions;

    // Display settings
    fadeOnDisable: boolean;
    focusScaleFactor: number;

    // Internal settings (not set by the user)
    collapseState: boolean;
    collapseLegend: boolean;
}

export const DEFAULT_STATE_SETTINGS = {
    id: DEFAULT_STATE_ID,
    name: "Vault (default)",
    engineOptions: new EngineOptions(),
    toggleTypes: { }
};

let shapeQueriesIndex = 0;
export const DEFAULT_SETTINGS: ExtendedGraphSettings = {
    // Interactive settings
    interactiveSettings: {},
    additionalProperties: {},
    
    // Graph settings
    backupGraphOptions: new EngineOptions(),
    states: [DEFAULT_STATE_SETTINGS],

    // Images
    imageProperty: "image",
    borderFactor: 0.06,

    // Nodes sizes
    nodesSizeProperty: "",
    nodesSizeFunction: 'default',
    // Nodes colors
    nodesColorColormap: 'YlOrRd',
    nodesColorFunction: 'default',
    // Links sizes
    linksSizeFunction: 'default',
    // Links colors
    linksColorColormap: 'YlOrRd',
    linksColorFunction: 'default',

    // Zoom on node
    zoomFactor: 2,

    // Performances
    maxNodes: 20,
    delay: 500,

    // Feature toggles
    enableFeatures: {
        'graph': {
            'tags'              : false,
            'properties'        : false,
            'property-key'      : true,
            'links'             : false,
            'curvedLinks'       : false,
            'folders'           : false,
            'imagesFromProperty': false,
            'focus'             : true,
            'shapes'            : false,
            'source'            : false,
            'target'            : false,
            'elements-stats'    : true,
        },
        'localgraph': {
            'tags'              : true,
            'properties'        : false,
            'property-key'      : true,
            'links'             : true,
            'curvedLinks'       : false,
            'folders'           : false,
            'imagesFromProperty': true,
            'focus'             : false,
            'shapes'            : true,
            'source'            : false,
            'target'            : false,
            'elements-stats'    : true,
        }
    },

    // Shapes
    shapeQueries: {
        'circle'   : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'square'   : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'triangle' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'diamond'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'pentagon' : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'hexagon'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'octagon'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'decagon'  : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star4'    : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star5'    : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star6'    : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star8'    : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
        'star10'   : {combinationLogic: 'AND', index: shapeQueriesIndex++, rules: []},
    },

    // Export SVG
    exportSVGOptions: {
        asImage: true,
        // Core options
        onlyVisibleArea: false,
        showNodeNames: true,
        // Extended options
        useCurvedLinks: false,
        useNodesShapes: false,
        showArcs: false,
        showFolders: true,
    },

    // Display settings
    fadeOnDisable: false,
    focusScaleFactor: 1.8,

    // Internal settings (not set by the user)
    collapseState: true,
    collapseLegend: true,
};

