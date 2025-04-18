// app/modules/appController.js - Core application controller

import * as UI from './ui.js';
import * as Storage from './storage.js';
import * as Customization from './customization.js';
import * as ProjectManager from './projectManager.js';
import * as PlaylistManager from './playlistManager.js';
import * as AssetManager from './assetManager.js';
import * as EventBinder from './eventBinder.js';
import * as FileHandler from './fileHandler.js';
import * as PlaybackController from './playbackController.js';
import * as ProjectController from './projectController.js';
import * as TimingEditorController from './timingEditorController.js';
import * as LyricsEditor from './lyricsEditor.js';

// --- Global State ---
// Most state moved to specific controllers (ProjectController, PlaybackController, TimingEditorController)

// --- Export specifically for debugging
// Retain this for now, might be useful
window.KaraokeEditor = {
    UI,
    Storage,
    Customization,
    ProjectManager,
    PlaylistManager,
    AssetManager,
    EventBinder,
    FileHandler,
    PlaybackController,
    ProjectController,
    TimingEditorController,
    LyricsEditor,
    get currentProject() { return ProjectController.getCurrentProject(); },
};

//== Initialize the app ===
export function initApp() {
    // Initialize core UI and Storage first
    UI.init();
    Storage.init();

    // Initialize Managers
    AssetManager.init();
    ProjectManager.init(ProjectController.loadProjectDataIntoModules);
    PlaylistManager.init(ProjectController.loadAndPlayProject, onPlaylistUpdate);

    // Initialize Controllers (pass necessary dependencies)
    LyricsEditor.init({ UI });

    ProjectController.init({
        UI,
        Storage,
        AssetManager,
        Customization,
        PlaybackController,
        LyricsEditor,
        onProjectLoaded: () => {
             TimingEditorController.syncLyrics();
             UI.displayLyrics(
                 ProjectController.getCurrentProjectLyrics(),
                 TimingEditorController.isEditorVisible(),
                 TimingEditorController.onLyricTimeFieldClick
             );
        }
    });
    PlaybackController.init({ UI, ProjectController, LyricsEditor });
    TimingEditorController.init({
        UI,
        PlaybackController,
        ProjectController,
        LyricsEditor,
        onLyricsChanged: ProjectController.updateCurrentProjectLyrics
    });

    // Initialize Customization (needs project controller to apply/save theme)
    Customization.init(ProjectController.applyAndSaveTheme);

    // Bind all UI events
    EventBinder.init({
        UI,
        FileHandler,
        ProjectController,
        PlaybackController,
        TimingEditorController,
        ProjectManager,
        LyricsEditor,
        Customization
    });

    // Load initial state
    ProjectManager.loadHistory();
    AssetManager.loadSessionAssets();
    PlaylistManager.loadCurrentPlaylist();
    const savedTheme = Storage.loadTheme();
    Customization.applyTheme(savedTheme || Customization.getDefaultTheme());
    if (savedTheme) {
        UI.updateThemeInputs(savedTheme);
    }

    // Initial UI setup
    PlaybackController.resetUI();

    console.log("Karaoke Editor Initialized");
}

function onPlaylistUpdate() {
    console.log("Playlist updated (stub)");
}