// app/modules/storage.js

const PROJECTS_KEY = 'karaoke_projects';
const THEME_KEY = 'karaoke_theme';

export function init() {}

export function saveProject(project) {
    const all = loadAllProjects();
    all[project.meta.id] = project;
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
}

export function loadAllProjects() {
    try {
        return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || {};
    } catch {
        return {};
    }
}

export function deleteProject(id) {
    const all = loadAllProjects();
    delete all[id];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
}

export function loadTheme() {
    try {
        return JSON.parse(localStorage.getItem(THEME_KEY)) || null;
    } catch {
        return null;
    }
}

export function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
}