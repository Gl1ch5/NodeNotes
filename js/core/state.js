export const state = {
    nodes: {},
    edges: [],
    transform: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 },
    selectedNodeId: null,
    zIndexCounter: 10
};

export const genId = () => 'n_' + Math.random().toString(36).substr(2, 9);

export const screenToWorld = (x, y) => ({
    x: (x - state.transform.x) / state.transform.scale,
    y: (y - state.transform.y) / state.transform.scale
});