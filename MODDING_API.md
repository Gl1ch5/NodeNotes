# Modding API Documentation

Welcome to the NodeNotes Modding API! The Lab workspace supports loading custom `.js` scripts that can interact with the internal module system, allowing developers to create custom processing nodes (e.g., translators, image generators, aggregators).

## Loading a Mod
In the "Lab" mode, use the **"Загрузить Мод (.js)"** file input to select a JavaScript file.

## How it works
When a file is loaded, its text content is evaluated in a sandboxed `Function` context that is injected with a single argument: `api`.

The `api` object exposes several core methods and state references from the main application:

### The `api` Object

*   `api.createLabNode(title: string, description: string, xOffset: number, yOffset: number, setupCallback: function)`
    *   **Description**: Creates a new Node on the active Lab canvas.
    *   **Parameters**:
        *   `title`: The name of your custom node.
        *   `description`: The initial text inside the node's textarea.
        *   `xOffset`, `yOffset`: Positioning relative to the center of the screen.
        *   `setupCallback`: A function `(node, id, textArea)` called after the node is instantiated. Use this to append custom HTML (buttons, inputs) or event listeners to `node.el`.

*   `api.state`
    *   **Description**: A Proxy object reflecting the *currently active workspace*.
    *   **Properties**: `state.nodes`, `state.edges`, `state.groups`, etc.

*   `api.workspaces`
    *   **Description**: An object containing the raw data for both workspaces: `workspaces.main` and `workspaces.lab`.

---

## Example Mod: Reverse Text Node

Save the following code as `ReverseMod.js` and upload it via the Lab Menu. It will create a new button in the Lab Menu that spawns a node which reverses the text of whatever it connects to.

```javascript
// ReverseMod.js
// The `api` object is automatically provided to this script.

const { createLabNode, state } = api;

// Find the Lab Menu DOM element
const labMenu = document.getElementById('lab-menu');

// Create a new button for our custom node
const btnCustom = document.createElement('button');
btnCustom.className = 'panel-btn';
btnCustom.style.width = '100%';
btnCustom.style.justifyContent = 'center';
btnCustom.style.background = '#8a2be2'; // Purple to distinguish it
btnCustom.style.color = '#fff';
btnCustom.style.marginTop = '10px';
btnCustom.textContent = '+ Reverse Text Node';

// When clicked, spawn the custom node on the canvas
btnCustom.addEventListener('click', () => {

    // Spawn a node offset to the right
    createLabNode("Reverse Text", "Reverses connected text", 150, 0, (node, id, textArea) => {

        // Add a "Run" button inside the node body
        const runBtn = document.createElement('button');
        runBtn.textContent = "Run Reverse";
        runBtn.className = "lab-btn";
        runBtn.style.marginTop = "10px";
        runBtn.style.width = "100%";
        runBtn.style.pointerEvents = "auto";

        runBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); // Prevent node dragging

            // Find incoming edges to this specific node ID
            const incomingEdges = state.edges.filter(e => e.toNode === id && e.toType === 'in');

            if (incomingEdges.length === 0) {
                textArea.value = "ERROR: No input connected.";
                return;
            }

            // Get the ID of the node connected to our input socket
            const sourceNodeId = incomingEdges[0].fromNode;
            const sourceNode = state.nodes[sourceNodeId];

            if (sourceNode) {
                // Read text, reverse it, and output it
                const inputNotes = sourceNode.el.querySelector('.node-textarea').value;
                textArea.value = inputNotes.split('').reverse().join('');
            }
        });

        // Append our custom button to the node
        node.el.querySelector('.node-body').appendChild(runBtn);
    });
});

// Add the button to the UI
labMenu.appendChild(btnCustom);
```