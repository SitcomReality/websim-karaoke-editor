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
let duration = 0;
let lyricsArray = [];
let ignoreProgressBarUpdate = false;
let autoSelectNextLine = false;

// --- Export specifically for debugging
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

//== Initialize the app ===
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

    // Show default song duration/progress
    UI.resetProgressBar();

    // NEW: auto select next line checkbox
    const autoSelectCheckbox = document.getElementById('auto-select-next-line');
    if (autoSelectCheckbox) {
        autoSelectNextLine = autoSelectCheckbox.checked;
        autoSelectCheckbox.addEventListener('change', (e) => {
            autoSelectNextLine = e.target.checked;
        });
    }
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

    // Playback UI events
    UI.elements.playPauseButton.addEventListener('click', onPlayPauseClicked);
    UI.elements.prevSongButton.addEventListener('click', onPrevSongClicked);
    UI.elements.nextSongButton.addEventListener('click', onNextSongClicked);
    UI.elements.volumeSlider.addEventListener('input', (e) => {
        AudioHandler.setVolume(e.target.value);
    });

    // Seek bar
    UI.elements.progressBar.addEventListener('input', (e) => {
        if (duration > 0) {
            ignoreProgressBarUpdate = true;
            const seekTime = parseFloat(e.target.value);
            AudioHandler.seek(seekTime);
            onAudioTimeUpdate(seekTime, duration);
            setTimeout(() => {
                ignoreProgressBarUpdate = false;
            }, 100); // ignore updates momentarily
        }
    });

    // Timing editor controls
    UI.elements.setLineStartButton.addEventListener('click', () => {
        const ct = getAudioTime();
        LyricsEditor.setCurrentLineStart(ct);
        UI.highlightLyric(LyricsEditor.getCurrentEditorLineIdx());
        refreshLyricsToProject();
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick); 
    });
    UI.elements.setLineEndButton.addEventListener('click', () => {
        const ct = getAudioTime();
        LyricsEditor.setCurrentLineEnd(ct);

        if (autoSelectNextLine) {
            // Select next line if possible
            const idx = LyricsEditor.getCurrentEditorLineIdx();
            if (typeof idx === 'number' && idx < lyricsArray.length - 1) {
                LyricsEditor.updateEditorTarget(idx + 1);
            }
        }
        UI.highlightLyric(LyricsEditor.getCurrentEditorLineIdx());
        refreshLyricsToProject();
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick); 
    });
    UI.elements.nudgeStartBackButton.addEventListener('click', () => {
        LyricsEditor.nudgeCurrentLineStart(-0.1);
        UI.highlightLyric(LyricsEditor.getCurrentEditorLineIdx());
        refreshLyricsToProject();
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
    });
    UI.elements.nudgeStartForwardButton.addEventListener('click', () => {
        LyricsEditor.nudgeCurrentLineStart(0.1);
        UI.highlightLyric(LyricsEditor.getCurrentEditorLineIdx());
        refreshLyricsToProject();
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
    });
    UI.elements.nudgeEndBackButton.addEventListener('click', () => {
        LyricsEditor.nudgeCurrentLineEnd(-0.1);
        UI.highlightLyric(LyricsEditor.getCurrentEditorLineIdx());
        refreshLyricsToProject();
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
    });
    UI.elements.nudgeEndForwardButton.addEventListener('click', () => {
        LyricsEditor.nudgeCurrentLineEnd(0.1);
        UI.highlightLyric(LyricsEditor.getCurrentEditorLineIdx());
        refreshLyricsToProject();
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
    });
    UI.elements.clearLineTimesButton.addEventListener('click', () => {
        LyricsEditor.clearCurrentLineTimes();
        UI.highlightLyric(LyricsEditor.getCurrentEditorLineIdx());
        refreshLyricsToProject();
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
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
        LyricsEditor.setLyrics(parsedLyrics);

        // Update UI and State
        currentProject = newProject;
        lyricsArray = parsedLyrics;
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

        duration = 0;
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
    const projectName = UI.elements.projectNameInput.value.trim() || currentProject.meta.title;
    if (!projectName) {
        alert("Please enter a name for the song project.");
        UI.elements.projectNameInput.focus();
        return;
    }

    currentProject.meta.title = projectName;
    // Persist current timings from LyricsEditor
    currentProject.lyrics = LyricsEditor.getLyrics();

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
            lyricsArray = importedData.lyrics || [];
            LyricsEditor.setLyrics(lyricsArray);
            ProjectManager.loadProjectData(currentProject);

            // Add to history after successful load + asset verification
            Storage.saveProject(currentProject);
            ProjectManager.displayHistory();

            // Update UI (audio/image/lyrics)
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

// Timing editor mode toggle
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
    UI.setTimingEditorVisible(isEditing);
    UI.updateLayoutPadding(isEditing);
    // Re-render lyrics to show/hide times for left column
    if (lyricsArray && lyricsArray.length) {
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
    }
}

//=== PLAYBACK UI logic ===

function onPlayPauseClicked() {
    if (!currentProject) {
        alert("No song loaded!");
        return;
    }
    if (AudioHandler.isPlaying()) {
        AudioHandler.pause();
        UI.elements.playPauseButton.textContent = '▶️ Play';
    } else {
        AudioHandler.play();
        UI.elements.playPauseButton.textContent = '⏸️ Pause';
    }
}

function onPrevSongClicked() {
    // TODO: playlist logic
    // Stub for playlist navigation
    alert("Previous song (playlist) - not implemented yet.");
}
function onNextSongClicked() {
    // TODO: playlist logic
    alert("Next song (playlist) - not implemented yet.");
}

//== Progress bar, lyric highlighting, and timing ==

function onAudioTimeUpdate(currentTime, dur) {
    if (!ignoreProgressBarUpdate) {
        UI.updateProgressBar(currentTime, dur || duration);
    }
    // Find lyrics line that should be highlighted
    if (lyricsArray && lyricsArray.length) {
        const idx = LyricsEditor.findLineForTime(currentTime);
        UI.highlightLyric(idx);
    }
}
function getAudioTime() {
    return AudioHandler.getCurrentTime();
}
function onAudioLoaded(dur) {
    duration = dur || AudioHandler.getDuration();
    UI.updateProgressBar(0, duration);
    UI.elements.progressBar.max = duration;
    UI.elements.progressBar.value = 0;
}
function onAudioEnded() {
    UI.elements.playPauseButton.textContent = '▶️ Play';
    UI.highlightLyric(null);
    UI.updateProgressBar(duration, duration);
}
function onTimingChange(newLyricsArr) {
    lyricsArray = newLyricsArr;
    if (currentProject) currentProject.lyrics = newLyricsArr;
    UI.displayLyrics(lyricsArray);
}

// Needed when the project is loaded or the lyrics updated by the editor
function refreshLyricsToProject() {
    if (currentProject) {
        currentProject.lyrics = LyricsEditor.getLyrics();
        lyricsArray = currentProject.lyrics;
        // UI.displayLyrics(lyricsArray); Don't call this or you'll lose selection; only update highlighting as needed
    }
}
function applyTheme(theme) {
    // Optionally handle storing theme
    if (currentProject) {
        currentProject.theme = theme;
        Storage.saveTheme(theme);
    }
}
function loadAndPlayProject(project) {
    // Should: load project, then play automatically (for playlist)
    // Here, same as loading project in import, then call AudioHandler.play();
    loadProjectDataIntoModules(project);
    setTimeout(() => {
        AudioHandler.play();
        UI.elements.playPauseButton.textContent = '⏸️ Pause';
    }, 300);
}
function onPlaylistUpdate() {
    // stub for now
}
function loadProjectDataIntoModules(project) {
    // Used for directly loading a saved project from history/playlist
    if (!project) return;
    currentProject = project;
    lyricsArray = project.lyrics || [];
    LyricsEditor.setLyrics(lyricsArray);
    const audioAsset = AssetManager.findAssetById(project.assets.audio);
    const imageAsset = project.assets.image ? AssetManager.findAssetById(project.assets.image) : null;

    // Update UI and state
    UI.updateProjectName(currentProject.meta.title);
    UI.displayLyrics(lyricsArray);
    if (audioAsset) AudioHandler.loadAudio(audioAsset.url);
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
    // Also refresh lyrics list and click handlers for input
    if (lyricsArray && lyricsArray.length) {
        UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
    }
}

// Attach input logic for lyric-time-fields to enable manual entry
function onLyricTimeFieldClick(evt) {
    // Only act if click was on a .lyric-time-field
    const target = evt.target;
    if (!target.classList.contains('lyric-time-field')) return;
    const li = target.closest('li');
    if (!li) return;
    const idx = parseInt(li.dataset.idx, 10);

    // Get line info
    const line = lyricsArray[idx];
    // Open prompt for editing: show both start/end, prefilled, mm:ss format
    const startStr = typeof line.start === 'number' ? LyricsEditor.formatTime(line.start) : '';
    const endStr = typeof line.end === 'number' ? LyricsEditor.formatTime(line.end) : '';

    let input = prompt(
      `Edit timings for this line:\n[format: mm:ss or ss.ss, separate start & end with "-"]\nLeave blank to unset a value.\n\nCurrent: [${startStr}] – [${endStr}]`,
      startStr && endStr ? `${startStr}-${endStr}` : startStr || endStr
    );
    if (input === null) return;

    input = input.trim();
    let newStart = line.start, newEnd = line.end;
    let error = null;

    // Parse input
    function parseTimeField(str) {
        if (!str || str === '--:--') return null;
        if (/^\d+:\d{1,2}(\.\d+)?$/.test(str)) {
            const [min, sec] = str.split(':');
            return Number(min) * 60 + Number(sec);
        } else if (/^\d+(\.\d+)?$/.test(str)) {
            return Number(str);
        } else {
            return null;
        }
    }
    let vals = input.split('-');
    if (vals.length === 2) {
        newStart = parseTimeField(vals[0].trim());
        newEnd = parseTimeField(vals[1].trim());
    } else if (vals.length === 1) {
        // If only one, overwrite start, clear end (if blank)
        newStart = parseTimeField(vals[0].trim());
        if (vals[0].trim() === '') newStart = null;
        newEnd = null;
    }

    // Constrain: start >= 0, end > start, end <= start of next line
    const prevEnd = idx > 0 && typeof lyricsArray[idx - 1].end === 'number' ? lyricsArray[idx - 1].end : undefined;
    const nextStart = idx < lyricsArray.length - 1 && typeof lyricsArray[idx + 1].start === 'number' ? lyricsArray[idx + 1].start : undefined;

    if (typeof newStart === 'number' && newStart < 0) newStart = 0;
    if (typeof newEnd === 'number' && typeof newStart === 'number' && newEnd <= newStart) error = 'End time must be after start time!';
    if (typeof nextStart === 'number' && typeof newEnd === 'number' && newEnd > nextStart)
        error = `End time must not exceed start of next line (${LyricsEditor.formatTime(nextStart)})!`;

    if (error) {
        alert(error);
        return;
    }

    LyricsEditor.setLineTimes(idx, newStart, newEnd);

    // When editing times, always select the current line in UI for user feedback
    LyricsEditor.updateEditorTarget(idx);
    UI.highlightLyric(idx);
    refreshLyricsToProject();
    UI.displayLyrics(lyricsArray, undefined, onLyricTimeFieldClick);
}