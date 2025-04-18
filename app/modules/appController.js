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
    ProjectController.init({
        UI,
        Storage,
        AssetManager,
        Customization,
        PlaybackController, 
        LyricsEditor: TimingEditorController.getLyricsEditorModule(), 
        onProjectLoaded: () => { 
             TimingEditorController.syncLyrics(); 
             PlaybackController.syncWithProject(); 
             UI.displayLyrics(ProjectController.getCurrentProject()?.lyrics || [], TimingEditorController.isEditorVisible(), TimingEditorController.onLyricTimeFieldClick);
        }
    });
    PlaybackController.init({ UI, ProjectController, LyricsEditor: TimingEditorController.getLyricsEditorModule() }); 
    TimingEditorController.init({ UI, PlaybackController, ProjectController, onLyricsChanged: ProjectController.updateCurrentProjectLyrics }); 

    // Initialize Customization (needs project controller to apply/save theme)
    Customization.init(ProjectController.applyAndSaveTheme);

    // Bind all UI events
    EventBinder.init({
        UI,
        FileHandler,
        ProjectController,
        PlaybackController,
        TimingEditorController,
        ProjectManager 
    });

    // Load initial state
    ProjectManager.loadHistory(); 
    AssetManager.loadSessionAssets(); 
    PlaylistManager.loadCurrentPlaylist(); 
    Customization.applyTheme(Storage.loadTheme() || Customization.getDefaultTheme()); 

    // Initial UI setup
    PlaybackController.resetUI(); 

    console.log("Karaoke Editor Initialized");
}

// --- Event Registration ---
// removed function setupCoreEventListeners() {} - Moved to eventBinder.js

// --- Core Functionalities ---

// removed async function handleLoadNewSong() {} - Moved to fileHandler.js
// removed function saveCurrentProject() {} - Moved to projectController.js
// removed async function handleImportProject(event) {} - Moved to fileHandler.js
// removed function toggleTimingEditor() {} - Moved to timingEditorController.js

//=== PLAYBACK UI logic ===

// removed function onPlayPauseClicked() {} - Moved to playbackController.js
// removed function onPrevSongClicked() {} - Moved to playbackController.js (or playlist manager later)
// removed function onNextSongClicked() {} - Moved to playbackController.js (or playlist manager later)

//== Progress bar, lyric highlighting, and timing ==

// removed function onAudioTimeUpdate(currentTime, dur) {} - Moved to playbackController.js
// removed function getAudioTime() {} - Now accessed via PlaybackController.getAudioTime()
// removed function onAudioLoaded(dur) {} - Moved to playbackController.js
// removed function onAudioEnded() {} - Moved to playbackController.js
// removed function onTimingChange(newLyricsArr) {} - Handled by TimingEditorController callback
// removed function refreshLyricsToProject() {} - Logic incorporated into ProjectController/TimingEditorController interactions
// removed function applyTheme(theme) {} - Moved to projectController.js as applyAndSaveTheme
// removed function loadAndPlayProject(project) {} - Moved to projectController.js
// removed function onPlaylistUpdate() {} - Still here, needs implementation or removal
function onPlaylistUpdate() {
    // stub for now
    console.log("Playlist updated (stub)");
}
// removed function loadProjectDataIntoModules(project) {} - Moved to projectController.js
// removed function onLyricTimeFieldClick(evt) {} - Moved to timingEditorController.js