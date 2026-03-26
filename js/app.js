// --- СОСТОЯНИЕ ---
const state = {
    nodes: {},
    edges: [],
    transform: { x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 },
    selectedNodeId: null,
    zIndexCounter: 10
};

const workspace = document.getElementById('workspace');
const nodesContainer = document.getElementById('nodes-container');
const svgLayer = document.getElementById('svg-layer');
const gridCanvas = document.getElementById('grid-canvas');
const gridCtx = gridCanvas.getContext('2d');

const resizeObserver = new ResizeObserver(() => renderEdges());
const genId = () => 'n_' + Math.random().toString(36).substr(2, 9);
const screenToWorld = (x, y) => ({
    x: (x - state.transform.x) / state.transform.scale,
    y: (y - state.transform.y) / state.transform.scale
});

// --- БЕСКОНЕЧНАЯ ЛОГАРИФМИЧЕСКАЯ СЕТКА ---
function drawGrid() {
    gridCanvas.width = window.innerWidth;
    gridCanvas.height = window.innerHeight;

    const style = getComputedStyle(document.body);
    gridCtx.fillStyle = style.getPropertyValue('--bg-color').trim();
    gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

    const scale = state.transform.scale;
    const tx = state.transform.x;
    const ty = state.transform.y;

    const level = Math.floor(Math.log(scale) / Math.log(5));
    const worldStep = 100 / Math.pow(5, level);
    const screenStep = worldStep * scale;
    const screenStepLarge = screenStep * 5;

    gridCtx.lineWidth = 1;

    gridCtx.strokeStyle = style.getPropertyValue('--grid-sub').trim();
    gridCtx.beginPath();
    for (let x = tx % screenStep; x < gridCanvas.width; x += screenStep) { gridCtx.moveTo(x, 0); gridCtx.lineTo(x, gridCanvas.height); }
    for (let y = ty % screenStep; y < gridCanvas.height; y += screenStep) { gridCtx.moveTo(0, y); gridCtx.lineTo(gridCanvas.width, y); }
    gridCtx.stroke();

    gridCtx.strokeStyle = style.getPropertyValue('--grid-main').trim();
    gridCtx.beginPath();
    for (let x = tx % screenStepLarge; x < gridCanvas.width; x += screenStepLarge) { gridCtx.moveTo(x, 0); gridCtx.lineTo(x, gridCanvas.height); }
    for (let y = ty % screenStepLarge; y < gridCanvas.height; y += screenStepLarge) { gridCtx.moveTo(0, y); gridCtx.lineTo(gridCanvas.width, y); }
    gridCtx.stroke();
}

function updateTransform() {
    workspace.style.transform = `translate(${state.transform.x}px, ${state.transform.y}px) scale(${state.transform.scale})`;
    drawGrid();
}

// --- ЛОГИКА НОД ---
function selectNode(id) {
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

function createNode(worldX, worldY) {
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

function deleteNode(id) {
    if (!state.nodes[id]) return;
    resizeObserver.unobserve(state.nodes[id].el);
    state.nodes[id].el.remove();
    delete state.nodes[id];
    state.edges = state.edges.filter(edge => edge.fromNode !== id && edge.toNode !== id);
    renderEdges();
}

// --- ЛОГИКА СВЯЗЕЙ ---
function createEdge(fromNode, fromType, toNode, toType) {
    const isDuplicate = state.edges.some(e =>
        (e.fromNode === fromNode && e.toNode === toNode && e.fromType === fromType && e.toType === toType) ||
        (e.fromNode === toNode && e.toNode === fromNode && e.fromType === toType && e.toType === fromType)
    );
    if (!isDuplicate) {
        state.edges.push({ id: genId(), fromNode, fromType, toNode, toType });
        renderEdges();
    }
}

function getSocketCoords(nodeId, type) {
    const node = state.nodes[nodeId];
    if (!node) return { x: 0, y: 0 };
    const portEl = node.el.querySelector(`.socket-hitbox.${type} .socket`);
    if (!portEl) return { x: node.x, y: node.y };
    const rect = portEl.getBoundingClientRect();
    return screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function drawBezier(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const offset = Math.max(dx * 0.4, 60);
    return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
}

function renderEdges() {
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

// --- ГЛОБАЛЬНЫЕ СОБЫТИЯ (ПАН И ЗУМ) ---
let activePointers = new Map();
let initialPinchDist = 0, initialPinchScale = 1;
let lastTapTime = 0;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let transformStartX = 0, transformStartY = 0;

document.body.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#top-panel') || e.target.closest('.node')) return;

    activePointers.set(e.pointerId, e);

    // Мультитач (Пинч зум)
    if (activePointers.size === 2) {
        isPanning = false;
        const pts = Array.from(activePointers.values());
        initialPinchDist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
        initialPinchScale = state.transform.scale;
        return;
    }

    // Двойной тап/клик для создания
    const now = Date.now();
    if (now - lastTapTime < 300) {
        const wPos = screenToWorld(e.clientX, e.clientY);
        createNode(wPos.x, wPos.y);
        lastTapTime = 0;
        return;
    }
    lastTapTime = now;

    // Начало панорамирования фона
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    transformStartX = state.transform.x;
    transformStartY = state.transform.y;
    selectNode(null);

    document.body.setPointerCapture(e.pointerId);
});

document.body.addEventListener('pointermove', (e) => {
    if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, e);

    // Обработка Pinch Зума
    if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
        const cx = (pts[0].clientX + pts[1].clientX) / 2;
        const cy = (pts[0].clientY + pts[1].clientY) / 2;

        const newScale = Math.max(0.01, Math.min(initialPinchScale * (dist / initialPinchDist), 100));
        const ratio = newScale / state.transform.scale;

        state.transform.x = cx - (cx - state.transform.x) * ratio;
        state.transform.y = cy - (cy - state.transform.y) * ratio;
        state.transform.scale = newScale;
        updateTransform();
    }
    // Обработка Панорамирования
    else if (isPanning && activePointers.size === 1) {
        state.transform.x = transformStartX + (e.clientX - panStartX);
        state.transform.y = transformStartY + (e.clientY - panStartY);
        updateTransform();
    }
});

const endGlobalPointer = (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size === 0) isPanning = false;
};

document.body.addEventListener('pointerup', endGlobalPointer);
document.body.addEventListener('pointercancel', endGlobalPointer);

// Колесико мыши
window.addEventListener('wheel', (e) => {
    if (e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();

    const oldScale = state.transform.scale;
    let newScale = oldScale * (e.deltaY > 0 ? 0.85 : 1.15);
    newScale = Math.max(0.01, Math.min(newScale, 100));

    const ratio = newScale / oldScale;
    state.transform.x = e.clientX - (e.clientX - state.transform.x) * ratio;
    state.transform.y = e.clientY - (e.clientY - state.transform.y) * ratio;
    state.transform.scale = newScale;

    updateTransform();
}, { passive: false });

window.addEventListener('resize', () => { drawGrid(); renderEdges(); });

window.addEventListener('keydown', (e) => {
    if ((e.code === 'Delete' || e.code === 'Backspace') && state.selectedNodeId) {
        const activeTag = document.activeElement.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
            deleteNode(state.selectedNodeId);
            state.selectedNodeId = null;
        }
    }
});

// --- КНОПКИ ПАНЕЛИ ---
        const btnMode = document.getElementById('btn-mode');
        const modeText = document.getElementById('mode-text');
        const labPanel = document.getElementById('lab-panel');
        let isLabMode = false;

        btnMode.addEventListener('click', () => {
            isLabMode = !isLabMode;
            if (isLabMode) {
                modeText.textContent = "Режим: Lab";
                labPanel.classList.add('open');
            } else {
                modeText.textContent = "Режим: Nodes";
                labPanel.classList.remove('open');
            }
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

        // --- ЛАБОРАТОРИЯ ИИ ---
        const btnRunAi = document.getElementById('btn-run-ai');
        const aiStatus = document.getElementById('ai-status');

        function getConnectedNodesSequence() {
            if (!state.selectedNodeId) return [];

            const sequence = [];
            const visited = new Set();
            let currentId = state.selectedNodeId;

            // Найдем начало цепочки, двигаясь назад по 'in' связям
            while (true) {
                const incomingEdge = state.edges.find(e => e.toNode === currentId && e.toType === 'in');
                if (!incomingEdge || visited.has(incomingEdge.fromNode)) break;
                currentId = incomingEdge.fromNode;
                visited.add(currentId);
            }

            visited.clear();

            // Теперь идем вперед и собираем все ноды
            while (currentId) {
                if (visited.has(currentId)) break;
                visited.add(currentId);
                const node = state.nodes[currentId];
                if (node) {
                    const text = node.el.querySelector('.node-textarea').value;
                    if (text.trim()) sequence.push({ id: currentId, text });
                }
                const outgoingEdge = state.edges.find(e => e.fromNode === currentId && e.fromType === 'out');
                currentId = outgoingEdge ? outgoingEdge.toNode : null;
            }

            return sequence;
        }

        btnRunAi.addEventListener('click', async () => {
            const apiKey = document.getElementById('api-key').value.trim();
            const promptStr = document.getElementById('ai-prompt').value.trim();

            if (!apiKey) {
                aiStatus.textContent = "Ошибка: Введите Groq API Key";
                return;
            }
            if (!promptStr) {
                aiStatus.textContent = "Ошибка: Введите промпт/задачу";
                return;
            }

            if (!state.selectedNodeId) {
                aiStatus.textContent = "Ошибка: Выберите ноду для начала цепочки";
                return;
            }

            const sequence = getConnectedNodesSequence();
            if (sequence.length === 0) {
                aiStatus.textContent = "Ошибка: Пустая цепочка нод";
                return;
            }

            const contextText = sequence.map((n, i) => `[Нода ${i + 1}]:\n${n.text}`).join("\n\n");
            const fullPrompt = `Задача: ${promptStr}\n\nКонтекст (цепочка нод):\n${contextText}\n\nПожалуйста, выполни задачу и верни только результат, без лишних вступлений.`;

            btnRunAi.disabled = true;
            aiStatus.textContent = "Отправка запроса к Groq API...";

            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: "llama3-8b-8192", // Или "mixtral-8x7b-32768"
                        messages: [
                            { role: "system", content: "You are a helpful assistant integrated into a node-based laboratory tool. You process sequences of text from nodes and perform tasks on them." },
                            { role: "user", content: fullPrompt }
                        ],
                        temperature: 0.7,
                    })
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                const aiResult = data.choices[0].message.content.trim();

                // Создаем новую ноду с результатом в конце цепочки
                const lastNodeId = sequence[sequence.length - 1].id;
                const lastNode = state.nodes[lastNodeId];

                // Рассчитываем позицию для новой ноды (правее последней)
                const newX = lastNode.x + 350;
                const newY = lastNode.y;

                const newNodeId = createNode(newX, newY);
                state.nodes[newNodeId].el.querySelector('.node-title').value = "AI Result";
                state.nodes[newNodeId].el.querySelector('.node-textarea').value = aiResult;

                createEdge(lastNodeId, 'out', newNodeId, 'in');

                aiStatus.textContent = "Готово! Результат добавлен в новую ноду.";
            } catch (error) {
                aiStatus.textContent = `Ошибка: ${error.message}`;
                console.error(error);
            } finally {
                btnRunAi.disabled = false;
            }
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

// --- СТАРТ ---
function init() {
    state.transform.x = window.innerWidth / 2;
    state.transform.y = window.innerHeight / 2;
    updateTransform();

    const n1 = createNode(-140, -80);
    state.nodes[n1].el.querySelector('.node-textarea').value = "Теперь перетаскивание на телефоне работает идеально. Просто берите за шапку!";
}
init();