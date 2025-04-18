// app/modules/appController.js - Core application controller

import * as UI from './ui.js';
import * as AudioHandler from './audioHandler.js';
import * as LyricsEditor from './lyricsEditor.js';
import * as Storage from './storage.js';
import * as Customization from './customization.js';
import * as ImportExport from './importExport.js';
import * as ProjectManager from './projectManager.js';
import * as PlaylistManager from './playlistManager.js';
import * as AssetManager from './assetManager.js';


// --- Global State ---
let currentProject = null;
let isEditing = false;

export function initApp() {
    // Initialize modules and UI event listeners
    UI.init();
    Storage.init();
    AssetManager.init();
    AudioHandler.init(onAudioTimeUpdate, onAudioEnded, onAudioLoaded);
    LyricsEditor.init(getAudioTime, onTimingChange);
    Customization.init(applyTheme);
    PlaylistManager.init(loadAndPlayProject, onPlaylistUpdate);
    ProjectManager.init(loadProjectDataIntoModules);

    setupCoreEventListeners();

    ProjectManager.loadHistory();
    AssetManager.loadSessionAssets();
    PlaylistManager.loadCurrentPlaylist();
    Customization.applyTheme(Storage.loadTheme() || Customization.getDefaultTheme());

    // Expose for debugging (optional)
    window.KaraokeEditor = {
        UI,
        AudioHandler,
        LyricsEditor,
        Storage,
        Customization,
        ImportExport,
        ProjectManager,
        PlaylistManager,
        AssetManager,
        get currentProject() { return currentProject; },
    };
}

// --- Event Registration ---
function setupCoreEventListeners() {
    // File loading
    UI.elements.loadFilesButton.addEventListener('click', handleLoadNewSong);

    // Timing editor toggle
    UI.elements.toggleEditorButton.addEventListener('click', toggleTimingEditor);

    // Project management
    UI.elements.saveProjectButton.addEventListener('click', saveCurrentProject);
    UI.elements.exportProjectButton.addEventListener('click', () => {
        if (currentProject) {
            ImportExport.exportProject(currentProject);
        } else {
            alert("No project loaded to export.");
        }
    });
    UI.elements.importProjectInput.addEventListener('change', handleImportProject);

    // History interaction
    UI.elements.historyList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI' && e.target.dataset.projectId) {
            ProjectManager.loadProject(e.target.dataset.projectId);
        } else if (e.target.classList.contains('delete-history-btn') && e.target.dataset.projectId) {
            if (confirm('Are you sure you want to delete this song from history? This cannot be undone.')) {
                ProjectManager.deleteProjectFromHistory(e.target.dataset.projectId);
            }
        }
    });
}

// --- Core Functionalities ---

async function handleLoadNewSong() {
    const audioFile = UI.elements.audioUpload.files[0];
    const lyricsFile = UI.elements.lyricsUpload.files[0];
    const imageFile = UI.elements.imageUpload.files[0];

    if (!audioFile) {
        alert("Please select an audio file.");
        return;
    }
    if (!lyricsFile) {
        alert("Please select a lyrics file.");
        return;
    }

    try {
        UI.setLoading(true, "Loading new song...");

        // Create a new project structure
        const projectId = `proj_${Date.now()}`;
        const newProject = ProjectManager.createNewProjectData(projectId);
        newProject.meta.title = UI.elements.projectNameInput.value || audioFile.name.replace(/\.[^/.]+$/, "");

        // Process and store assets
        const audioAsset = await AssetManager.addAsset(audioFile, 'audio');
        const lyricsText = await lyricsFile.text();
        let imageAsset = null;
        if (imageFile) {
            imageAsset = await AssetManager.addAsset(imageFile, 'image');
            newProject.assets.image = imageAsset.id;
        }
        newProject.assets.audio = audioAsset.id;

        // Parse Lyrics
        const parsedLyrics = LyricsEditor.parseLyrics(lyricsText, audioFile.name);
        newProject.lyrics = parsedLyrics;

        // Update UI and State
        currentProject = newProject;
        UI.updateProjectName(currentProject.meta.title);
        UI.displayLyrics(currentProject.lyrics);
        AudioHandler.loadAudio(audioAsset.url);
        if (imageAsset) {
            UI.displaySongImage(imageAsset.url);
            Customization.extractAndApplyColors(imageAsset.url, true);
        } else {
            UI.displaySongImage(null);
            Customization.resetThemeToDefault();
        }
        AudioHandler.resetPlayback();
        UI.clearActiveLyric();
        UI.resetProgressBar();
        if (isEditing) {
            LyricsEditor.updateEditorTarget(null);
        }

        // Reset file inputs
        UI.elements.audioUpload.value = '';
        UI.elements.lyricsUpload.value = '';
        UI.elements.imageUpload.value = '';
        UI.elements.projectNameInput.value = '';

        console.log("New song loaded:", currentProject);

    } catch (error) {
        console.error("Error loading new song:", error);
        alert(`Failed to load song: ${error.message}`);
    } finally {
        UI.setLoading(false);
    }
}

function saveCurrentProject() {
    if (!currentProject) {
        alert("No song loaded to save.");
        return;
    }
    const projectName = UI.elements.projectNameInput.value.trim();
    if (!projectName) {
        alert("Please enter a name for the song project.");
        UI.elements.projectNameInput.focus();
        return;
    }

    currentProject.meta.title = projectName;

    try {
        Storage.saveProject(currentProject);
        ProjectManager.displayHistory();
        alert(`Project "${projectName}" saved successfully!`);
    } catch (error) {
        console.error("Error saving project:", error);
        alert(`Failed to save project: ${error.message}`);
    }
}

async function handleImportProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        UI.setLoading(true, "Importing project...");
        const importedData = await ImportExport.importProject(file);
        if (importedData) {
            // Prompt user to associate required assets
            const audioNeeded = importedData.assets.audio;
            const imageNeeded = importedData.assets.image;

            let audioAsset = AssetManager.findAssetById(audioNeeded);
            let imageAsset = imageNeeded ? AssetManager.findAssetById(imageNeeded) : null;

            if (!audioAsset) {
                alert(`Imported project requires audio asset "${audioNeeded}". Please upload or select it from the session assets.`);
                throw new Error("Missing required audio asset for import.");
            }
            if (imageNeeded && !imageAsset) {
                alert(`Imported project requires image asset "${imageNeeded}". Please upload or select it from the session assets.`);
                throw new Error("Missing required image asset for import.");
            }

            currentProject = importedData;
            ProjectManager.loadProjectData(currentProject);

            // Add to history after successful load + asset verification
            Storage.saveProject(currentProject);
            ProjectManager.displayHistory();

            alert(`Project "${currentProject.meta.title}" imported successfully!`);
        }
    } catch (error) {
        console.error("Error importing project:", error);
        alert(`Failed to import project: ${error.message}`);
    } finally {
        UI.setLoading(false);
        event.target.value = '';
    }
}

function toggleTimingEditor() {
    isEditing = !isEditing;
    UI.elements.timingEditorDiv.style.display = isEditing ? 'block' : 'none';
    UI.elements.toggleEditorButton.textContent = isEditing ? 'Hide Timing Editor' : 'Show Timing Editor';
    if (isEditing) {
        UI.elements.lyricsList.classList.add('editable');
        LyricsEditor.enableEditing();
    } else {
        UI.elements.lyricsList.classList.remove('editable');
        LyricsEditor.disableEditing();
    }
    UI.updateLayoutPadding(isEditing);
}

// --- Stub Callbacks ---
function onAudioTimeUpdate(time) {
    // Update logic for onAudioTimeUpdate - TBA
}
function onAudioEnded() {}
function onAudioLoaded() {}
function getAudioTime() {}
function onTimingChange() {}
function applyTheme(theme) {}
function loadAndPlayProject(project) {}
function onPlaylistUpdate() {}
function loadProjectDataIntoModules(project) {}