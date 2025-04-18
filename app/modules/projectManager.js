// app/modules/projectManager.js

import * as Storage from './storage.js';
import * as UI from './ui.js';

let loadProjectDataCb = null;

export function init(loadProjectData) {
    loadProjectDataCb = loadProjectData;
    displayHistory();
}

export function createNewProjectData(id) {
    return {
        meta: {
            id,
            title: '',
        },
        lyrics: [],
        assets: {},
        theme: null,
    };
}

export function loadProject(id) {
    const data = Storage.loadAllProjects()[id];
    if (data && loadProjectDataCb) {
        loadProjectDataCb(data);
    }
}

export function loadProjectData(project) {
    if (loadProjectDataCb) loadProjectDataCb(project);
}

export function displayHistory() {
    const all = Storage.loadAllProjects();
    const ul = UI.elements.historyList;
    ul.innerHTML = '';
    const keys = Object.keys(all);
    if (!keys.length) {
        ul.innerHTML = '<li class="placeholder">No saved songs yet.</li>';
        return;
    }
    keys.reverse().forEach(id => {
        const p = all[id];
        const li = document.createElement('li');
        li.textContent = p.meta.title || '[Untitled]';
        li.dataset.projectId = id;
        // Add delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.className = 'delete-history-btn delete-btn';
        delBtn.dataset.projectId = id;
        li.appendChild(delBtn);
        ul.appendChild(li);
    });
}

export function deleteProjectFromHistory(id) {
    Storage.deleteProject(id);
    displayHistory();
}

export function loadHistory() {
    displayHistory();
}