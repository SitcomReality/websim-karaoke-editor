// storage.js - Saving and loading to/from localStorage

const PROJECTS_KEY = 'karaoke_projects';
const THEME_KEY = 'karaoke_theme';

export function init() {
    // No-op, but could check storage sanity or migrate
}

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