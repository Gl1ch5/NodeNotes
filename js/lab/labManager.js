import { initStoryModule } from './modules/storyModule.js';

let isLabMode = false;

export function toggleLabMode() {
    isLabMode = !isLabMode;
    const labView = document.getElementById('lab-view');
    const workspace = document.getElementById('workspace');

    if (isLabMode) {
        labView.classList.add('active');
        workspace.classList.add('hidden');
    } else {
        labView.classList.remove('active');
        workspace.classList.remove('hidden');
    }

    return isLabMode;
}

export function initLab() {
    initStoryModule();
}