import { state } from '../core/state.js';
import { updateTransform, drawGrid } from '../core/workspace.js';
import { toggleLabMode } from '../lab/labManager.js';
import { groupSelectedNodes } from './node.js';

export function initTopPanel() {
    const btnMode = document.getElementById('btn-mode');
    const modeText = document.getElementById('mode-text');

    btnMode.addEventListener('click', () => {
        const isLabMode = toggleLabMode();
        modeText.textContent = isLabMode ? "Режим: Lab" : "Режим: Nodes";
    });

    document.getElementById('btn-group').addEventListener('click', () => {
        groupSelectedNodes();
    });

    document.getElementById('btn-focus').addEventListener('click', () => {
        const nodeIds = Object.keys(state.nodes);
        if (nodeIds.length === 0) {
            state.transform = { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 };
            updateTransform();
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodeIds.forEach(id => {
            const n = state.nodes[id];
            const w = 280;
            const h = n.el.offsetHeight || 150;
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x + w > maxX) maxX = n.x + w;
            if (n.y + h > maxY) maxY = n.y + h;
        });

        const padding = 100;
        const w = maxX - minX + padding * 2;
        const h = maxY - minY + padding * 2;

        const scaleX = window.innerWidth / w;
        const scaleY = window.innerHeight / h;
        let newScale = Math.min(scaleX, scaleY);
        newScale = Math.max(0.1, Math.min(newScale, 2));

        const centerX = minX + (maxX - minX) / 2;
        const centerY = minY + (maxY - minY) / 2;

        state.transform.scale = newScale;
        state.transform.x = window.innerWidth / 2 - centerX * newScale;
        state.transform.y = window.innerHeight / 2 - centerY * newScale;
        updateTransform();
    });

    document.getElementById('btn-theme').addEventListener('click', () => {
        const html = document.documentElement;
        html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        setTimeout(() => drawGrid(), 50);
    });

    document.getElementById('btn-export').addEventListener('click', () => {
        const exportData = {
            nodes: Object.values(state.nodes).map(n => ({
                id: n.id, x: Math.round(n.x), y: Math.round(n.y),
                title: n.el.querySelector('.node-title').value,
                text: n.el.querySelector('.node-textarea').value
            })),
            edges: state.edges
        };
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        a.download = "notes.json";
        document.body.appendChild(a); a.click(); a.remove();
    });
}