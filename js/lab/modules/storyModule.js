import { state } from '../../core/state.js';
import { createNode } from '../../components/node.js';

export function initStoryModule() {
    const btnModuleStory = document.getElementById('btn-module-story');
    const aiStatusStory = document.getElementById('ai-status-story');
    const btnFetchModels = document.getElementById('btn-fetch-models');
    const modelSelect = document.getElementById('model-select');

    btnFetchModels.addEventListener('click', async () => {
        const apiKey = document.getElementById('api-key').value.trim();
        if (!apiKey) {
            alert('Введите API Key для загрузки моделей');
            return;
        }

        try {
            btnFetchModels.textContent = '...';
            const res = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) throw new Error('Ошибка при загрузке моделей');
            const data = await res.json();

            modelSelect.innerHTML = '';
            data.data.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.id;
                modelSelect.appendChild(opt);
            });
        } catch(e) {
            alert(e.message);
        } finally {
            btnFetchModels.textContent = 'Загрузить';
        }
    });

    btnModuleStory.addEventListener('click', async () => {
        const apiKey = document.getElementById('api-key').value.trim();

        if (!apiKey) {
            aiStatusStory.textContent = "Ошибка: Введите Groq API Key";
            return;
        }

        const nodesValues = Object.values(state.nodes);
        if (nodesValues.length === 0) {
            aiStatusStory.textContent = "Ошибка: Нет нод для создания сюжета.";
            return;
        }

        const allText = nodesValues.map((n, i) => `[Нода ${i + 1}]:\n${n.el.querySelector('.node-textarea').value}`).join("\n\n");
        const fullPrompt = `Задача: Создай связный и интересный рассказ или сюжет на основе всех следующих заметок.\n\nЗаметки:\n${allText}\n\nПожалуйста, верни только сгенерированный текст сюжета, без лишних вступлений.`;

        btnModuleStory.disabled = true;
        aiStatusStory.textContent = "Генерация сюжета...";

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelSelect.value || "llama3-8b-8192",
                    messages: [
                        { role: "system", content: "You are a creative writer integrated into a laboratory tool. You take multiple disconnected notes and weave them into a cohesive story." },
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

            // Создаем новую ноду в центре экрана
            const centerX = state.transform.x + (window.innerWidth / 2) / state.transform.scale;
            const centerY = state.transform.y + (window.innerHeight / 2) / state.transform.scale;

            const newNodeId = createNode(centerX - 140, centerY - 100);
            state.nodes[newNodeId].el.querySelector('.node-title').value = "Сгенерированный Сюжет";
            state.nodes[newNodeId].el.querySelector('.node-textarea').value = aiResult;

            // Выделяем новую ноду визуально (можно добавить кастомный класс, если нужно)
            state.nodes[newNodeId].el.style.border = "2px solid #ffcc00";

            aiStatusStory.textContent = "Готово! Сюжет добавлен на холст.";
        } catch (error) {
            aiStatusStory.textContent = `Ошибка: ${error.message}`;
            console.error(error);
        } finally {
            btnModuleStory.disabled = false;
        }
    });
}