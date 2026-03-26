import { state, screenToWorld } from './state.js';
import { createNode, selectNode } from '../components/node.js';
import { renderEdges } from '../components/edge.js';

export const workspace = document.getElementById('workspace');
export const nodesContainer = document.getElementById('nodes-container');
export const svgLayer = document.getElementById('svg-layer');
const gridCanvas = document.getElementById('grid-canvas');
const gridCtx = gridCanvas.getContext('2d');

export const resizeObserver = new ResizeObserver(() => renderEdges());

export function drawGrid() {
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

export function updateTransform() {
    workspace.style.transform = `translate(${state.transform.x}px, ${state.transform.y}px) scale(${state.transform.scale})`;
    drawGrid();
}

// --- ГЛОБАЛЬНЫЕ СОБЫТИЯ (ПАН И ЗУМ) ---
let activePointers = new Map();
let initialPinchDist = 0, initialPinchScale = 1;
let lastTapTime = 0;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let transformStartX = 0, transformStartY = 0;

export function initWorkspaceEvents() {
    // Используем #workspace для событий, чтобы не блокировать интерфейс
    document.getElementById('workspace').addEventListener('pointerdown', (e) => {
        if (e.target.closest('.node')) return;

        e.preventDefault(); // Защита от скролла страницы на мобилках

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

        document.getElementById('workspace').setPointerCapture(e.pointerId);
    });

    document.getElementById('workspace').addEventListener('pointermove', (e) => {
        if (!isPanning && activePointers.size < 2) return;
        e.preventDefault(); // Защита от скролла страницы на мобилках

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

    document.getElementById('workspace').addEventListener('pointerup', endGlobalPointer);
    document.getElementById('workspace').addEventListener('pointercancel', endGlobalPointer);

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
}