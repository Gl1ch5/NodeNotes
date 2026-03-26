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

export function drawBezier(x1, y1, x2, y2, isVertical = false) {
    if (isVertical) {
        const dy = Math.abs(y2 - y1);
        const offset = Math.max(dy * 0.4, 60);
        return `M ${x1} ${y1} C ${x1} ${y1 + offset}, ${x2} ${y2 - offset}, ${x2} ${y2}`;
    } else {
        const dx = Math.abs(x2 - x1);
        const offset = Math.max(dx * 0.4, 60);
        return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
    }
}

export function renderEdges() {
    // Удаляем все постоянные линии (временная .noodle-temp остается, так как ее нет в state.edges)
    Array.from(svgLayer.querySelectorAll('.noodle')).forEach(child => child.remove());

    state.edges.forEach(edge => {
        const fromNode = state.nodes[edge.fromNode];
        const toNode = state.nodes[edge.toNode];

        // Hide edges if either connected node is grouped (hidden)
        if ((fromNode && fromNode.el.style.display === 'none') ||
            (toNode && toNode.el.style.display === 'none')) {
            return;
        }

        let start, end;
        start = getSocketCoords(edge.fromNode, edge.fromType);
        end = getSocketCoords(edge.toNode, edge.toType);

        let pathD = "";

        // Horizontal connection (in/out)
        if ((edge.fromType === 'out' || edge.fromType === 'in') && (edge.toType === 'in' || edge.toType === 'out')) {
            if (edge.fromType === 'out') {
                pathD = drawBezier(start.x, start.y, end.x, end.y);
            } else {
                pathD = drawBezier(end.x, end.y, start.x, start.y);
            }
        }
        // Vertical connection (top/bottom)
        else if ((edge.fromType === 'top' || edge.fromType === 'bottom') && (edge.toType === 'top' || edge.toType === 'bottom')) {
            if (edge.fromType === 'bottom') {
                pathD = drawBezier(start.x, start.y, end.x, end.y, true);
            } else {
                pathD = drawBezier(end.x, end.y, start.x, start.y, true);
            }
        }
        // Mixed connection (e.g. out to top) - fallback to direct line or mixed bezier logic
        else {
            pathD = drawBezier(start.x, start.y, end.x, end.y);
        }

        const isDetailProp = (edge.fromType === 'top' || edge.fromType === 'bottom' || edge.toType === 'top' || edge.toType === 'bottom');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'noodle');
        path.setAttribute('d', pathD);

        if (isDetailProp) {
            path.setAttribute('stroke-dasharray', '8,4');
            path.style.stroke = 'var(--text-muted)';
        }

        path.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            state.edges = state.edges.filter(eItem => eItem.id !== edge.id);
            renderEdges();
        });
        svgLayer.appendChild(path);
    });
}