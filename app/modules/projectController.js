// app/modules/projectController.js
// Manages the current project state, loading, saving, and coordinating updates

import * as ProjectManager from './projectManager.js'; // For generating new project structure
import * as ImportExport from './importExport.js';

let UI, Storage, AssetManager, Customization, PlaybackController, LyricsEditor;
let onProjectLoadedCallback = null;
let currentProject = null;

export function init(dependencies) {
    UI = dependencies.UI;
    Storage = dependencies.Storage;
    AssetManager = dependencies.AssetManager;
    Customization = dependencies.Customization;
    PlaybackController = dependencies.PlaybackController;
    LyricsEditor = dependencies.LyricsEditor; 
    onProjectLoadedCallback = dependencies.onProjectLoaded;
}

export function getCurrentProject() {
    return currentProject;
}

export function getCurrentProjectLyrics() {
    return currentProject?.lyrics || [];
}

export function findAssetById(id) {
    return AssetManager.findAssetById(id);
}

// --- Project Lifecycle ---

export function createNewProject() {
    const projectId = `proj_${Date.now()}`;
    return ProjectManager.createNewProjectData(projectId);
    // Note: This project is NOT the currentProject yet. FileHandler will call loadProject after setup.
}

/**
 * Loads a project object into the application state and updates UI.
 * @param {object} projectData - The project data object.
 * @param {boolean} [isImport=false] - If true, saves the project to history after loading.
 */
export function loadProject(projectData, isImport = false) {
    if (!projectData || !projectData.meta || !projectData.assets?.audio) {
        console.error("Attempted to load invalid project data:", projectData);
        alert("Cannot load project: Invalid data structure or missing audio asset.");
        return;
    }

    currentProject = projectData;
    console.log("Loading project:", currentProject.meta.title);

    // Update core modules with project data
    LyricsEditor.setLyrics(currentProject.lyrics || []);

    // Update UI elements
    UI.updateProjectName(currentProject.meta.title || '[Untitled]');
    UI.elements.projectNameInput.value = currentProject.meta.title || ''; // Pre-fill name input

    // Handle image display and theme
    const imageAsset = currentProject.assets.image ? AssetManager.findAssetById(currentProject.assets.image) : null;
    if (imageAsset) {
        UI.displaySongImage(imageAsset.url);
        // Apply theme from project if exists, otherwise extract or default
        if (currentProject.theme) {
            Customization.applyTheme(currentProject.theme);
        } else {
            Customization.extractAndApplyColors(imageAsset.url, true); // Auto-apply extracted colors
        }
    } else {
        UI.displaySongImage(null);
        // Apply theme from project if exists (even without image), otherwise reset
        if (currentProject.theme) {
             Customization.applyTheme(currentProject.theme);
        } else {
            Customization.resetThemeToDefault();
        }
    }

    // Signal PlaybackController to load audio and reset state
    PlaybackController.syncWithProject(); // This handles AudioHandler.loadAudio and UI resets

    // Clear active lyric highlighting initially
    UI.clearActiveLyric();

    // If it was an import or needs saving to history
    if (isImport) {
        Storage.saveProject(currentProject);
        ProjectManager.displayHistory(); // Update the history list UI
    }

    // Execute the final callback (e.g., to sync lyrics display)
    if (onProjectLoadedCallback) {
        onProjectLoadedCallback(currentProject);
    }
}

// Called by ProjectManager when loading from history list
export function loadProjectDataIntoModules(project) {
    loadProject(project, false); // Load without re-saving to history
}

export function loadAndPlayProject(project) {
    loadProject(project, false);
    // Add a small delay to ensure audio is ready, then play
    setTimeout(() => {
        PlaybackController.onPlayPauseClicked(); // Simulate play click
    }, 300);
}


export function saveCurrentProject() {
    if (!currentProject) {
        alert("No song loaded to save.");
        return;
    }
    const projectName = UI.elements.projectNameInput.value.trim() || currentProject.meta.title;
    if (!projectName) {
        alert("Please enter a name for the song project.");
        UI.elements.projectNameInput.focus();
        return;
    }

    currentProject.meta.title = projectName;
    // Ensure lyrics are up-to-date from the editor module
    currentProject.lyrics = LyricsEditor.getLyrics();
    // Theme should have been updated via applyAndSaveTheme

    try {
        Storage.saveProject(currentProject);
        ProjectManager.displayHistory(); // Update history UI
        alert(`Project "${projectName}" saved successfully!`);
    } catch (error) {
        console.error("Error saving project:", error);
        alert(`Failed to save project: ${error.message}`);
    }
}

export function exportCurrentProject() {
     if (currentProject) {
        // Ensure latest lyrics are included before exporting
        currentProject.lyrics = LyricsEditor.getLyrics();
        ImportExport.exportProject(currentProject);
    } else {
        alert("No project loaded to export.");
    }
}


// --- Project Data Updates ---

// Called by FileHandler during new song loading
export function updateProjectMetadata(project, { title }) {
    if (project && project.meta) {
        project.meta.title = title;
    }
}
export function updateProjectAssets(project, { audio, image }) {
     if (project && project.assets) {
        if (audio !== undefined) project.assets.audio = audio;
        if (image !== undefined) project.assets.image = image;
    }
}
export function updateProjectLyrics(project, lyricsArray) {
    if (project) {
        project.lyrics = lyricsArray || [];
    }
}

// Called by TimingEditorController when lyrics change
export function updateCurrentProjectLyrics(lyricsArray) {
    if (currentProject) {
        currentProject.lyrics = lyricsArray || [];
        // Maybe trigger an auto-save flag or indicator?
    }
}

// Called by Customization module or UI events
export function applyAndSaveTheme(theme) {
    Customization.applyTheme(theme); // Apply visually
    if (currentProject) {
        currentProject.theme = theme;
        Storage.saveTheme(theme); // Save theme globally (optional: could save per-project)
        // May need to trigger project save if theme changes should persist with the project explicitly
    }
}