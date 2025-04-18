// app/modules/playbackController.js
// Manages audio playback state, controls, progress bar, and lyric highlighting sync

import * as AudioHandler from './audioHandler.js';

let UI, ProjectController, LyricsEditor; // Injected dependencies
let duration = 0;
let ignoreProgressBarUpdate = false; // Flag to prevent feedback loop during seek

export function init(dependencies) {
    UI = dependencies.UI;
    ProjectController = dependencies.ProjectController;
    LyricsEditor = dependencies.LyricsEditor;

    // Initialize AudioHandler with callbacks managed by this controller
    AudioHandler.init(onAudioTimeUpdate, onAudioEnded, onAudioLoaded);
}

export function resetUI() {
    UI.resetProgressBar();
    UI.elements.playPauseButton.textContent = '▶️ Play';
    if (UI.elements.progressBar) UI.elements.progressBar.value = 0;
    if (UI.elements.volumeSlider) UI.elements.volumeSlider.value = AudioHandler.getVolume();
    duration = 0;
}

export function syncWithProject() {
    // Called when a new project is loaded
    resetUI();
    const project = ProjectController.getCurrentProject();
    if (project?.assets?.audio) {
        const audioAsset = ProjectController.findAssetById(project.assets.audio);
        if (audioAsset) {
            AudioHandler.loadAudio(audioAsset.url);
            // Duration will be set by onAudioLoaded callback
        } else {
            console.warn(`Audio asset ${project.assets.audio} not found for project ${project.meta.title}`);
            // Handle missing audio asset state in UI?
        }
    } else {
         AudioHandler.loadAudio(''); // Unload audio if no asset specified
    }
}

// --- AudioHandler Callbacks ---

function onAudioTimeUpdate(currentTime, audioDuration) {
    // Use provided duration if available, otherwise use controller's cached duration
    const currentDuration = (typeof audioDuration === 'number' && !isNaN(audioDuration)) ? audioDuration : duration;

    if (!ignoreProgressBarUpdate) {
        UI.updateProgressBar(currentTime, currentDuration);
    }
    // Find and highlight the correct lyric line based on time
    const lyrics = ProjectController.getCurrentProjectLyrics();
    if (lyrics && lyrics.length) {
        const idx = LyricsEditor.findLineForTime(currentTime);
        UI.highlightLyric(idx);
    }
}

function onAudioLoaded(loadedDuration) {
    duration = loadedDuration || 0; // Update cached duration
    UI.updateProgressBar(0, duration);
    if (UI.elements.progressBar) UI.elements.progressBar.max = duration;
    // Potentially trigger project sync or other actions if needed
}

function onAudioEnded() {
    UI.elements.playPauseButton.textContent = '▶️ Play';
    UI.highlightLyric(null); // Clear highlight
    // Reset progress bar to end state or beginning? Let's keep it at the end.
    UI.updateProgressBar(duration, duration);
    // TODO: Playlist next song logic?
}


// --- UI Event Handlers ---

export function onPlayPauseClicked() {
    const project = ProjectController.getCurrentProject();
    if (!project || !project.assets.audio) {
        alert("No audio loaded for the current song!");
        return;
    }
    if (AudioHandler.isPlaying()) {
        AudioHandler.pause();
        UI.elements.playPauseButton.textContent = '▶️ Play';
    } else {
        // Ensure audio is loaded before playing
        const audioAsset = ProjectController.findAssetById(project.assets.audio);
        if (!audioAsset) {
             alert("Audio asset not found!");
             return;
        }
        // If audio src isn't set or different, reload (AudioHandler might do this implicitly)
         if(document.getElementById('audio-player').currentSrc !== audioAsset.url) {
             AudioHandler.loadAudio(audioAsset.url);
             // Need slight delay or wait for 'canplay' event if reloading source
             setTimeout(() => {
                 AudioHandler.play();
                 UI.elements.playPauseButton.textContent = '⏸️ Pause';
             }, 150); // Adjust delay as needed
         } else {
            AudioHandler.play();
            UI.elements.playPauseButton.textContent = '⏸️ Pause';
         }
    }
}

export function onPrevSongClicked() {
    // TODO: Implement playlist logic via PlaylistManager/ProjectController
    alert("Previous song (playlist) - not implemented yet.");
}

export function onNextSongClicked() {
    // TODO: Implement playlist logic via PlaylistManager/ProjectController
    alert("Next song (playlist) - not implemented yet.");
}

export function onVolumeChanged(event) {
    AudioHandler.setVolume(event.target.value);
}

export function onProgressBarSeek(event) {
     if (duration > 0) {
        ignoreProgressBarUpdate = true; // Prevent feedback loop
        const seekTime = parseFloat(event.target.value);
        AudioHandler.seek(seekTime);
        // Manually trigger time update logic for immediate feedback
        onAudioTimeUpdate(seekTime, duration);
        // Release the lock after a short delay
        setTimeout(() => {
            ignoreProgressBarUpdate = false;
        }, 100);
    }
}

// --- Getters ---
export function getAudioTime() {
    return AudioHandler.getCurrentTime();
}

export function getDuration() {
    return duration;
}