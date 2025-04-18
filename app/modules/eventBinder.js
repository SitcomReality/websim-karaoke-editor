// app/modules/eventBinder.js
// Handles binding DOM events to controller actions

let controllers = {}; // To hold references to UI, FileHandler, ProjectController, etc.

export function init(dependencies) {
    controllers = dependencies;
    bindEvents();
}

function bindEvents() {
    // Destructure all necessary controllers/modules passed in dependencies
    const {
        UI, FileHandler, ProjectController, PlaybackController,
        TimingEditorController, ProjectManager, LyricsEditor, Customization 
        // Add other controllers like PlaylistManager if needed
    } = controllers;

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
        const target = e.target;
        const li = target.closest('li[data-project-id]');

        if (target.classList.contains('delete-history-btn') && target.dataset.projectId) {
            e.stopPropagation(); // Prevent triggering load
            if (confirm('Are you sure you want to delete this song from history? This cannot be undone.')) {
                ProjectManager.deleteProjectFromHistory(target.dataset.projectId);
            }
        } else if (li) {
            ProjectManager.loadProject(li.dataset.projectId);
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

    // Lyrics list click for editing (now handled within LyricsEditor enable/disable)
    // Note: The click listener for time fields is added dynamically in UI.displayLyrics

    // Auto-select next line checkbox listener moved to TimingEditorController.init

    // Customization controls
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

    // Example Customization bindings (can be expanded)
    applyThemeBtn.addEventListener('click', () => {
        const theme = {
            background: colorBg.value,
            text: colorText.value,
            highlightBg: colorHighlightBg.value,
            highlightText: colorHighlightText.value,
        };
        ProjectController.applyAndSaveTheme(theme); // Use ProjectController to manage theme state
    });
    extractColorsBtn.addEventListener('click', () => {
        const project = ProjectController.getCurrentProject();
        const imageAsset = project?.assets?.image ? ProjectController.findAssetById(project.assets.image) : null;
        if (imageAsset?.url) {
            Customization.extractAndApplyColors(imageAsset.url, true); // Auto-apply extracted colors
        } else {
            alert("Load an image first to extract colors.");
        }
    });
    resetThemeBtn.addEventListener('click', () => {
         const defaultTheme = Customization.getDefaultTheme();
         ProjectController.applyAndSaveTheme(defaultTheme); // Apply and save default
         // Also reset color input UI elements
         colorBg.value = defaultTheme.background;
         colorText.value = defaultTheme.text;
         colorHighlightBg.value = defaultTheme.highlightBg;
         colorHighlightText.value = defaultTheme.highlightText;
    });
    // Add font loading logic if needed

    // Playlist controls (Example - adapt as needed)
    const addToPlaylistBtn = document.getElementById('add-to-playlist');
    const clearPlaylistBtn = document.getElementById('clear-playlist');
    const savePlaylistBtn = document.getElementById('save-playlist');
    const importPlaylistInput = document.getElementById('import-playlist');
    const exportPlaylistBtn = document.getElementById('export-playlist');
    // Add listeners for playlist controls... (using PlaylistManager potentially)

    // Asset controls (Example - adapt as needed)
    const clearAssetsBtn = document.getElementById('clear-assets');
    // Add listeners for asset controls... (using AssetManager potentially)
}