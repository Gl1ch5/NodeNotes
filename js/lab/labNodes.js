import { createNode, selectNode } from '../components/node.js';
import { state, workspaces } from '../core/state.js';

function createLabNode(title, description, xOffset, yOffset, setupCallback) {
    const centerX = state.transform.x + (window.innerWidth / 2) / state.transform.scale;
    const centerY = state.transform.y + (window.innerHeight / 2) / state.transform.scale;

    const id = createNode(centerX + xOffset, centerY + yOffset);
    const node = state.nodes[id];

    node.el.classList.add('lab-node');
    node.el.style.border = "2px solid #5a5a5a";

    const titleInput = node.el.querySelector('.node-title');
    titleInput.value = title;
    titleInput.readOnly = true;
    titleInput.style.color = "#ffaa00";

    const textArea = node.el.querySelector('.node-textarea');
    textArea.value = description;

    if (setupCallback) setupCallback(node, id, textArea);
    return id;
}

export function initLabNodes() {
    const labMenu = document.getElementById('lab-menu');
    const btnInput = document.getElementById('btn-add-input-node');
    const btnStory = document.getElementById('btn-add-story-node');
    const modUpload = document.getElementById('lab-mod-upload');

    // Make menu visible only when active class is present
    const observer = new MutationObserver(() => {
        labMenu.style.display = labMenu.classList.contains('active') ? 'flex' : 'none';
    });
    observer.observe(labMenu, { attributes: true, attributeFilter: ['class'] });

    btnInput.addEventListener('click', () => {
        createLabNode("Main Workspace Input", "Extracted text from all notes in the Main workspace will flow out of this node.", -250, -100, (node) => {
            node.el.querySelector('.socket-hitbox.in').style.display = 'none';
            node.el.querySelector('.node-textarea').readOnly = true;
        });
    });

    btnStory.addEventListener('click', () => {
        createLabNode("Story Generator", "Click Run to generate story from connected inputs.", 150, -100, (node, id, textArea) => {
            const runBtn = document.createElement('button');
            runBtn.textContent = "Run Generation";
            runBtn.className = "lab-btn";
            runBtn.style.marginTop = "10px";
            runBtn.style.width = "100%";
            runBtn.style.pointerEvents = "auto";

            runBtn.addEventListener('pointerdown', async (e) => {
                e.stopPropagation();

                const apiKey = document.getElementById('lab-api-key').value.trim();
                if (!apiKey) {
                    textArea.value = "ERROR: Missing API Key in Lab Menu.";
                    return;
                }

                // Gather input from connected nodes (rudimentary data flow)
                const incomingEdges = state.edges.filter(e => e.toNode === id && e.toType === 'in');
                if (incomingEdges.length === 0) {
                    textArea.value = "ERROR: No input connected.";
                    return;
                }

                runBtn.disabled = true;
                textArea.value = "Generating...";

                // Very simple implementation: grab text from main workspace if connected to "Main Workspace Input"
                let inputNotes = "";
                const sourceNodeId = incomingEdges[0].fromNode;
                const sourceNode = state.nodes[sourceNodeId];

                if (sourceNode && sourceNode.el.querySelector('.node-title').value.includes("Main Workspace")) {
                    const mainNodes = Object.values(workspaces.main.nodes);
                    inputNotes = mainNodes.map((n, i) => `[Node ${i + 1}]:\n${n.el.querySelector('.node-textarea').value}`).join("\n\n");
                } else {
                    inputNotes = sourceNode.el.querySelector('.node-textarea').value;
                }

                const prompt = `Task: Create a cohesive story based on the following notes.\n\nNotes:\n${inputNotes}`;

                try {
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({
                            model: "llama3-8b-8192",
                            messages: [{ role: "user", content: prompt }]
                        })
                    });

                    if (!response.ok) throw new Error(`API Error: ${response.status}`);
                    const data = await response.json();
                    textArea.value = data.choices[0].message.content.trim();
                } catch (error) {
                    textArea.value = `ERROR: ${error.message}`;
                } finally {
                    runBtn.disabled = false;
                }
            });

            node.el.querySelector('.node-body').appendChild(runBtn);
        });
    });

    // Simple Mod Loader
    modUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const code = e.target.result;
            try {
                // VERY basic and unsafe eval for demonstration/modding purposes
                // Expose internal functions to the mod script
                const modApi = {
                    createLabNode, state, workspaces
                };

                const modFunc = new Function('api', code);
                modFunc(modApi);
                alert('Mod loaded successfully!');
            } catch (err) {
                alert(`Failed to load mod: ${err.message}`);
            }
        };
        reader.readAsText(file);
    });
}