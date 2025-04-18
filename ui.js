// UI.js - Manages direct DOM manipulation and UI state

export const elements = {
    loadFilesButton: document.getElementById('load-files-button'),
    toggleEditorButton: document.getElementById('toggle-editor-button'),
    saveProjectButton: document.getElementById('save-project'),
    exportProjectButton: document.getElementById('export-project'),
    importProjectInput: document.getElementById('import-project'),
    audioUpload: document.getElementById('audio-upload'),
    lyricsUpload: document.getElementById('lyrics-upload'),
    imageUpload: document.getElementById('image-upload'),
    projectNameInput: document.getElementById('project-name'),
    lyricsList: document.getElementById('lyrics-list'),
    songTitle: document.getElementById('song-title'),
    songImage: document.getElementById('song-image'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingMessage: document.getElementById('loading-message'),
    historyList: document.getElementById('history-list'),
    controlsContainer: document.querySelector('.controls-container'),
    timingEditorDiv: document.querySelector('.timing-editor'),
};

export function init() {
    // Call initial layout update
    updateLayoutPadding(false); // Assume editor is hidden initially
}

export function setLoading(isLoading, message = "Loading...") {
    elements.loadingOverlay.classList.toggle('active', isLoading);
    elements.loadingMessage.textContent = message;
}

export function updateProjectName(title) {
    elements.songTitle.textContent = title;
}

export function displayLyrics(lyrics) {
    const ul = elements.lyricsList;
    ul.innerHTML = '';
    if (!lyrics || !lyrics.length) {
    }
    lyrics.forEach((line, idx) => {
        const li = document.createElement('li');
        li.textContent = line.text || '';
        li.dataset.idx = idx;
        ul.appendChild(li);
    });
}

export function displaySongImage(url) {
    if (url) {
        elements.songImage.src = url;
        elements.songImage.style.display = '';
    } else {
        elements.songImage.src = '';
        elements.songImage.style.display = 'none';
    }
}

export function clearActiveLyric() {
    Array.from(elements.lyricsList.children).forEach(li => li.classList.remove('current', 'editing'));
}

export function resetProgressBar() {
    // Progress bar logic; future implementation
}

export function updateLayoutPadding(isEditorVisible) {
    // This function was not defined in the original code,
    // so it is implemented here based on the assumption
    // that it should adjust padding based on editor visibility.
    // Let's adjust the main content padding instead of controls container
    const mainContent = document.querySelector('.main-content');
    const editorHeight = elements.timingEditorDiv?.offsetHeight || 0; // Get editor height if visible

    if (mainContent) {
         // Add extra padding-bottom to main content when editor is visible
         // We add a bit more than the editor height for visual spacing
         mainContent.style.paddingBottom = isEditorVisible ? `${editorHeight + 20}px` : '15px';
    }

    // Re-calculate sidebar max-height if needed, especially on smaller screens
    // This might require more complex logic depending on exact layout goals
}