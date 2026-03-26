// Dual-state implementation for Main and Lab workspaces
const createEmptyWorkspace = () => ({
    nodes: {},
    edges: [],
    groups: {},
    transform: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 },
    selectedNodeIds: new Set(),
    zIndexCounter: 10
});

export const workspaces = {
    main: createEmptyWorkspace(),
    lab: createEmptyWorkspace()
};

export let activeWorkspaceId = 'main';

export const state = new Proxy({}, {
    get: (target, prop) => workspaces[activeWorkspaceId][prop],
    set: (target, prop, value) => { workspaces[activeWorkspaceId][prop] = value; return true; }
});

export function switchWorkspace(id) {
    activeWorkspaceId = id;
}

export const genId = () => 'n_' + Math.random().toString(36).substr(2, 9);

export const screenToWorld = (x, y) => ({
    x: (x - state.transform.x) / state.transform.scale,
    y: (y - state.transform.y) / state.transform.scale
});