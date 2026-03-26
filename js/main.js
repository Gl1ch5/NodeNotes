import { state } from './core/state.js';
import { updateTransform, initWorkspaceEvents, drawGrid } from './core/workspace.js';
import { createNode, deleteNode } from './components/node.js';
import { initTopPanel } from './components/topPanel.js';
import { initLab } from './lab/labManager.js';

function init() {
    state.transform.x = window.innerWidth / 2;
    state.transform.y = window.innerHeight / 2;
    updateTransform();

    const n1 = createNode(-140, -80);
    state.nodes[n1].el.querySelector('.node-textarea').value = "Теперь перетаскивание на телефоне работает идеально. Просто берите за шапку!";

    initWorkspaceEvents();
    initTopPanel();
    initLab();

    window.addEventListener('keydown', (e) => {
        if ((e.code === 'Delete' || e.code === 'Backspace') && state.selectedNodeId) {
            const activeTag = document.activeElement.tagName;
            if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                deleteNode(state.selectedNodeId);
                state.selectedNodeId = null;
            }
        }
    });
}

init();