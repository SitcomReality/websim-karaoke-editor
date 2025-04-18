// app/modules/eventBinder.js
// Handles binding DOM events to controller actions

let controllers = {}; // To hold references to UI, FileHandler, ProjectController, etc.

export function init(dependencies) {
    controllers = dependencies;
    bindEvents();
}

function bindEvents() {
    const { UI, FileHandler, ProjectController, PlaybackController, TimingEditorController, ProjectManager } = controllers;

    // File loading
    UI.elements.loadFilesButton.addEventListener('click', FileHandler.handleLoadNewSong);
    UI.elements.importProjectInput.addEventListener('change', FileHandler.handleImportProject);

    // Timing editor toggle
    UI.elements.toggleEditorButton.addEventListener('click', TimingEditorController.toggleTimingEditor);

    // Project management
    UI.elements.saveProjectButton.addEventListener('click', ProjectController.saveCurrentProject);
    UI.elements.exportProjectButton.addEventListener('click', ProjectController.exportCurrentProject);

    // History interaction
    UI.elements.historyList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI' && e.target.dataset.projectId) {
             // Use ProjectManager to initiate load via ProjectController
            ProjectManager.loadProject(e.target.dataset.projectId);
        } else if (e.target.classList.contains('delete-history-btn') && e.target.dataset.projectId) {
            if (confirm('Are you sure you want to delete this song from history? This cannot be undone.')) {
                // Use ProjectManager to delete and update history UI
                ProjectManager.deleteProjectFromHistory(e.target.dataset.projectId);
            }
        }
    });

    // Playback UI events
    UI.elements.playPauseButton.addEventListener('click', PlaybackController.onPlayPauseClicked);
    UI.elements.prevSongButton.addEventListener('click', PlaybackController.onPrevSongClicked);
    UI.elements.nextSongButton.addEventListener('click', PlaybackController.onNextSongClicked);
    UI.elements.volumeSlider.addEventListener('input', PlaybackController.onVolumeChanged);
    UI.elements.progressBar.addEventListener('input', PlaybackController.onProgressBarSeek);

    // Timing editor controls
    UI.elements.setLineStartButton.addEventListener('click', TimingEditorController.onSetLineStart);
    UI.elements.setLineEndButton.addEventListener('click', TimingEditorController.onSetLineEnd);
    UI.elements.nudgeStartBackButton.addEventListener('click', () => TimingEditorController.onNudgeStart(-0.1));
    UI.elements.nudgeStartForwardButton.addEventListener('click', () => TimingEditorController.onNudgeStart(0.1));
    UI.elements.nudgeEndBackButton.addEventListener('click', () => TimingEditorController.onNudgeEnd(-0.1));
    UI.elements.nudgeEndForwardButton.addEventListener('click', () => TimingEditorController.onNudgeEnd(0.1));
    UI.elements.clearLineTimesButton.addEventListener('click', TimingEditorController.onClearLineTimes);

    // Auto-select next line checkbox
    const autoSelectCheckbox = document.getElementById('auto-select-next-line');
    if (autoSelectCheckbox) {
        autoSelectCheckbox.addEventListener('change', TimingEditorController.onAutoSelectNextChange);
    }

    // Customization controls (Example - adapt as needed)
    const fontSelect = document.getElementById('font-select');
    const googleFontInput = document.getElementById('google-font-input');
    const loadGoogleFontBtn = document.getElementById('load-google-font');
    const colorBg = document.getElementById('color-bg');
    const colorText = document.getElementById('color-text');
    const colorHighlightBg = document.getElementById('color-highlight-bg');
    const colorHighlightText = document.getElementById('color-highlight-text');
    const applyThemeBtn = document.getElementById('apply-theme');
    const extractColorsBtn = document.getElementById('extract-colors');
    const resetThemeBtn = document.getElementById('reset-theme');

    // Add listeners for customization if needed, potentially in a separate customization controller/binder
    // applyThemeBtn.addEventListener('click', () => { /* call customization method */ });
    // extractColorsBtn.addEventListener('click', () => { /* call customization method */ });
    // resetThemeBtn.addEventListener('click', () => { /* call customization method */ });

    // Playlist controls (Example - adapt as needed)
    const addToPlaylistBtn = document.getElementById('add-to-playlist');
    const clearPlaylistBtn = document.getElementById('clear-playlist');
    const savePlaylistBtn = document.getElementById('save-playlist');
    const importPlaylistInput = document.getElementById('import-playlist');
    const exportPlaylistBtn = document.getElementById('export-playlist');
    // Add listeners for playlist controls...

    // Asset controls (Example - adapt as needed)
    const clearAssetsBtn = document.getElementById('clear-assets');
    // Add listeners for asset controls...
}