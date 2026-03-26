import { state, screenToWorld, genId } from '../core/state.js';
import { svgLayer } from '../core/workspace.js';

export function createEdge(fromNode, fromType, toNode, toType) {
    const isDuplicate = state.edges.some(e =>
        (e.fromNode === fromNode && e.toNode === toNode && e.fromType === fromType && e.toType === toType) ||
        (e.fromNode === toNode && e.toNode === fromNode && e.fromType === toType && e.toType === fromType)
    );
    if (!isDuplicate) {
        state.edges.push({ id: genId(), fromNode, fromType, toNode, toType });
        renderEdges();
    }
}

export function getSocketCoords(nodeId, type) {
    const node = state.nodes[nodeId];
    if (!node) return { x: 0, y: 0 };
    const portEl = node.el.querySelector(`.socket-hitbox.${type} .socket`);
    if (!portEl) return { x: node.x, y: node.y };
    const rect = portEl.getBoundingClientRect();
    return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

export function drawBezier(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const offset = Math.max(dx * 0.4, 60);
    return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
}

export function renderEdges() {
    // Удаляем все постоянные линии (временная .noodle-temp остается, так как ее нет в state.edges)
    Array.from(svgLayer.querySelectorAll('.noodle')).forEach(child => child.remove());

    state.edges.forEach(edge => {
        let start, end;
        if (edge.fromType === 'out') {
            start = getSocketCoords(edge.fromNode, 'out');
            end = getSocketCoords(edge.toNode, 'in');
        } else {
            start = getSocketCoords(edge.toNode, 'out');
            end = getSocketCoords(edge.fromNode, 'in');
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'noodle');
        path.setAttribute('d', drawBezier(start.x, start.y, end.x, end.y));

        path.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            state.edges = state.edges.filter(eItem => eItem.id !== edge.id);
            renderEdges();
        });
        svgLayer.appendChild(path);
    });
}