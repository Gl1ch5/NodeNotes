import { state, screenToWorld, genId } from '../core/state.js';
import { nodesContainer, svgLayer, resizeObserver } from '../core/workspace.js';
import { renderEdges, createEdge, getSocketCoords, drawBezier } from './edge.js';

export function selectNode(id) {
    if (state.selectedNodeId && state.nodes[state.selectedNodeId]) {
        state.nodes[state.selectedNodeId].el.classList.remove('selected');
    }
    state.selectedNodeId = id;
    if (id) {
        const node = state.nodes[id];
        node.el.classList.add('selected');
        state.zIndexCounter++;
        node.el.style.zIndex = state.zIndexCounter;
    }
}

export function createNode(worldX, worldY) {
    const id = genId();
    const nodeEl = document.createElement('div');
    nodeEl.className = 'node';
    nodeEl.id = id;
    nodeEl.style.left = `${worldX}px`;
    nodeEl.style.top = `${worldY}px`;
    state.zIndexCounter++;
    nodeEl.style.zIndex = state.zIndexCounter;

    const gripIcon = `<svg viewBox="0 0 24 24"><circle cx="8" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>`;
    const trashIcon = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

    nodeEl.innerHTML = `
        <div class="node-header">
            <div class="drag-icon">${gripIcon}</div>
            <input type="text" class="node-title" value="Заметка">
            <button class="node-delete-btn" title="Удалить ноду">${trashIcon}</button>
        </div>
        <div class="node-body">
            <div class="socket-hitbox in" data-node="${id}" data-type="in"><div class="socket"></div></div>
            <textarea class="node-textarea" placeholder="Дважды тапните по фону..."></textarea>
            <div class="socket-hitbox out" data-node="${id}" data-type="out"><div class="socket"></div></div>
        </div>
    `;

    nodesContainer.appendChild(nodeEl);
    resizeObserver.observe(nodeEl);
    state.nodes[id] = { el: nodeEl, x: worldX, y: worldY };

    // Логика кнопки удаления
    const deleteBtn = nodeEl.querySelector('.node-delete-btn');
    deleteBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); // Не перехватываем выделение и таскание
        deleteNode(id);
    });

    // ИЗОЛИРОВАННАЯ ЛОГИКА ПЕРЕТАСКИВАНИЯ НОДЫ
    const header = nodeEl.querySelector('.node-header');
    header.addEventListener('pointerdown', (e) => {
        // Если кликнули в текстовое поле или кнопку удаления - не тащим
        if (e.target.tagName === 'INPUT' || e.target.closest('.node-delete-btn')) return;

        e.preventDefault(); // Останавливаем скролл телефона
        e.stopPropagation(); // Останавливаем панорамирование фона

        selectNode(id);
        const node = state.nodes[id];

        // Фиксируем разницу между кликом и левым верхним углом ноды
        const startWorld = screenToWorld(e.clientX, e.clientY);
        const offsetX = startWorld.x - node.x;
        const offsetY = startWorld.y - node.y;

        // Функция движения (локальная для этого перетаскивания)
        const onMove = (moveEvent) => {
            const currentWorld = screenToWorld(moveEvent.clientX, moveEvent.clientY);
            node.x = currentWorld.x - offsetX;
            node.y = currentWorld.y - offsetY;
            node.el.style.left = `${node.x}px`;
            node.el.style.top = `${node.y}px`;
            renderEdges();
        };

        // Функция отпускания
        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
        };

        // Вешаем слушатели на документ, чтобы не терять курсор/палец
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    });

    // ИЗОЛИРОВАННАЯ ЛОГИКА РИСОВАНИЯ СВЯЗЕЙ
    nodeEl.querySelectorAll('.socket-hitbox').forEach(sock => {
        sock.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const startNodeId = sock.dataset.node;
            const startType = sock.dataset.type;

            let tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            tempPath.setAttribute('class', 'noodle-temp');
            svgLayer.appendChild(tempPath);

            const updateLine = (clientX, clientY) => {
                const start = getSocketCoords(startNodeId, startType);
                const end = screenToWorld(clientX, clientY);
                const pathD = startType === 'out'
                    ? drawBezier(start.x, start.y, end.x, end.y)
                    : drawBezier(end.x, end.y, start.x, start.y);
                tempPath.setAttribute('d', pathD);
            };

            updateLine(e.clientX, e.clientY);

            const onMove = (moveEvt) => updateLine(moveEvt.clientX, moveEvt.clientY);

            const onUp = (upEvt) => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);

                tempPath.style.display = 'none';
                const dropEl = document.elementFromPoint(upEvt.clientX, upEvt.clientY);
                tempPath.style.display = '';

                const targetHitbox = dropEl ? dropEl.closest('.socket-hitbox') : null;

                if (targetHitbox) {
                    const targetNode = targetHitbox.dataset.node;
                    const targetType = targetHitbox.dataset.type;
                    if (targetNode !== startNodeId && targetType !== startType) {
                        createEdge(startNodeId, startType, targetNode, targetType);
                    }
                } else if (dropEl && (dropEl.tagName === 'BODY' || dropEl.tagName === 'CANVAS' || dropEl.id === 'workspace')) {
                    // Автосоздание ноды
                    const wPos = screenToWorld(upEvt.clientX, upEvt.clientY);
                    let newX = wPos.x, newY = wPos.y - 45;
                    if (startType === 'out') newX = wPos.x + 30; else newX = wPos.x - 310;

                    const newNodeId = createNode(newX, newY);
                    const tType = startType === 'out' ? 'in' : 'out';
                    createEdge(startNodeId, startType, newNodeId, tType);
                }

                tempPath.remove();
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
        });
    });

    // Выделение по клику (если кликнули в тело ноды)
    nodeEl.addEventListener('pointerdown', (e) => {
        selectNode(id);
        e.stopPropagation();
    });

    return id;
}

export function deleteNode(id) {
    if (!state.nodes[id]) return;
    resizeObserver.unobserve(state.nodes[id].el);
    state.nodes[id].el.remove();
    delete state.nodes[id];
    state.edges = state.edges.filter(edge => edge.fromNode !== id && edge.toNode !== id);
    renderEdges();
}