import * as UI from './ui.js';
import * as AudioHandler from './audio.js';
import * as LyricsHandler from './lyrics.js';
import * as Storage from './storage.js';
import * as Customization from './customization.js';
import * as ImportExport from './importExport.js';
import * as ProjectManager from './project.js';
import * as PlaylistManager from './playlist.js';
import * as AssetManager from './assets.js';

// --- Global State ---
let currentProject = null; // Holds the data for the currently loaded song project
let isEditing = false; // Flag to indicate if timing editor is active

// --- Initialization ---
function init() {
    console.log("Karaoke Editor Initializing...");

    // Initialize Modules
    UI.init();
    AudioHandler.init();
    LyricsHandler.init();
    Storage.init();
    Customization.init();
    AssetManager.init();
    PlaylistManager.init(); // Depends on AssetManager for checks
    ProjectManager.init(); // Depends on other modules

    // Setup Event Listeners handled by UI module or specific handlers
    setupCoreEventListeners();

    // Load initial state (history, assets, etc.)
    ProjectManager.loadHistory();
    AssetManager.loadSessionAssets(); // Display assets available in this session
    PlaylistManager.loadPlaylists(); // Load saved playlists
    PlaylistManager.displayPlaylist(); // Display the current or default playlist


    console.log("Initialization Complete.");
}

function setupCoreEventListeners() {
    // --- File Loading ---
    UI.elements.loadFilesButton.addEventListener('click', handleLoadNewSong);

    // --- Editor Toggle ---
    UI.elements.toggleEditorButton.addEventListener('click', toggleTimingEditor);

    // --- Project Management ---
    UI.elements.saveProjectButton.addEventListener('click', saveCurrentProject);
    UI.elements.exportProjectButton.addEventListener('click', () => {
        if (currentProject) {
            ImportExport.exportProject(currentProject);
        } else {
            alert("No project loaded to export.");
        }
    });
    UI.elements.importProjectInput.addEventListener('change', handleImportProject);

    // --- History Interaction ---
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


// --- Core Functionality ---

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

        // 1. Create a new project structure
        const projectId = `proj_${Date.now()}`;
        const newProject = ProjectManager.createNewProjectData(projectId);
        newProject.meta.title = UI.elements.projectNameInput.value || audioFile.name.replace(/\.[^/.]+$/, ""); // Use input or filename

        // 2. Process and store assets
        const audioAsset = await AssetManager.addAsset(audioFile, 'audio');
        const lyricsText = await lyricsFile.text(); // Read lyrics content
        let imageAsset = null;
        if (imageFile) {
            imageAsset = await AssetManager.addAsset(imageFile, 'image');
            newProject.assets.image = imageAsset.id;
        }
        newProject.assets.audio = audioAsset.id;

        // 3. Parse Lyrics
        const parsedLyrics = LyricsHandler.parseLyrics(lyricsText, audioFile.name); // Pass filename for potential format hints
        newProject.lyrics = parsedLyrics; // Store raw parsed lines (without timing initially)

        // 4. Update UI and State
        currentProject = newProject;
        UI.updateProjectName(currentProject.meta.title);
        UI.displayLyrics(currentProject.lyrics);
        AudioHandler.loadAudio(audioAsset.url);
        if (imageAsset) {
            UI.displaySongImage(imageAsset.url);
            // Automatically try extracting colors after loading image
            Customization.extractAndApplyColors(imageAsset.url, true); // Apply the extracted theme
        } else {
             UI.displaySongImage(null); // Clear image if none loaded
             Customization.resetThemeToDefault(); // Reset theme if no image
        }
        AudioHandler.resetPlayback();
        UI.clearActiveLyric();
        UI.resetProgressBar();
        if (isEditing) {
             LyricsHandler.updateEditorTarget(null); // Clear editor selection
        }


        // Reset file inputs for next use
        UI.elements.audioUpload.value = '';
        UI.elements.lyricsUpload.value = '';
        UI.elements.imageUpload.value = '';
        // Project name might be kept or cleared depending on preference, let's clear it
        UI.elements.projectNameInput.value = '';

        console.log("New song loaded:", currentProject);
        // Maybe save this basic structure to history immediately?
        // Storage.saveProject(currentProject);
        // ProjectManager.displayHistory(); // Refresh history list


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

    // Update project data before saving
    currentProject.meta.title = projectName;
    // Lyrics timings are updated directly during editing
    // Theme data is updated when colors/fonts are applied

    try {
        Storage.saveProject(currentProject);
        ProjectManager.displayHistory(); // Refresh history list
        // Add to current playlist if desired? Maybe not automatically.
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
                 // TODO: Implement UI to select/upload missing asset
                 // For now, we abort the load.
                 throw new Error("Missing required audio asset for import.");
            }
            if (imageNeeded && !imageAsset) {
                alert(`Imported project requires image asset "${imageNeeded}". Please upload or select it from the session assets.`);
                 // TODO: Implement UI to select/upload missing asset
                 // For now, we abort the load.
                 throw new Error("Missing required image asset for import.");
            }

            // Assets found, proceed to load the project
             currentProject = importedData; // Assume importProject validated the data
             ProjectManager.loadProjectData(currentProject); // Use the common loading logic


             // Add to history after successful load + asset verification
             Storage.saveProject(currentProject); // Save the imported project
             ProjectManager.displayHistory();

             alert(`Project "${currentProject.meta.title}" imported successfully!`);
        }
    } catch (error) {
        console.error("Error importing project:", error);
        alert(`Failed to import project: ${error.message}`);
    } finally {
         UI.setLoading(false);
         // Reset file input
        event.target.value = '';
    }
}


function toggleTimingEditor() {
    isEditing = !isEditing;
    UI.elements.timingEditorDiv.style.display = isEditing ? 'block' : 'none';
    UI.elements.toggleEditorButton.textContent = isEditing ? 'Hide Timing Editor' : 'Show Timing Editor';
    if (isEditing) {
        UI.elements.lyricsList.classList.add('editable');
        // Re-bind editor click listeners if necessary, or ensure they are always active
        LyricsHandler.enableEditing();
    } else {
        UI.elements.lyricsList.classList.remove('editable');
        LyricsHandler.disableEditing();
    }
}

// --- Expose for debugging (optional) ---
window.KaraokeEditor = {
    UI,
    AudioHandler,
    LyricsHandler,
    Storage,
    Customization,
    ImportExport,
    ProjectManager,
    PlaylistManager,
    AssetManager,
    init,
    get currentProject() { return currentProject; }
};

// --- Start the app ---
window.addEventListener('DOMContentLoaded', init);