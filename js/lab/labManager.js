import { switchWorkspace, state, workspaces } from '../core/state.js';
import { updateTransform, nodesContainer, svgLayer } from '../core/workspace.js';
import { renderEdges } from '../components/edge.js';
import { initLabNodes } from './labNodes.js';

let isLabMode = false;

function swapDOMNodes(targetWorkspaceId) {
    nodesContainer.innerHTML = '';
    svgLayer.innerHTML = '';

    const workspaceData = workspaces[targetWorkspaceId];
    Object.values(workspaceData.nodes).forEach(n => nodesContainer.appendChild(n.el));
}

export function toggleLabMode() {
    isLabMode = !isLabMode;
    const labMenu = document.getElementById('lab-menu');

    if (isLabMode) {
        // Swap to Lab workspace
        switchWorkspace('lab');
        swapDOMNodes('lab');
        updateTransform();
        renderEdges();
        labMenu.classList.add('active');
    } else {
        // Swap to Main workspace
        switchWorkspace('main');
        swapDOMNodes('main');
        updateTransform();
        renderEdges();
        labMenu.classList.remove('active');
    }

    return isLabMode;
}

export function initLab() {
    initLabNodes();
}