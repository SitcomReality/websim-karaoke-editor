// app/modules/ui.js

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
    updateLayoutPadding(false);
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
    if (!lyrics || !lyrics.length) return;
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
    // Future implementation
}

export function updateLayoutPadding(isEditorVisible) {
    const mainContent = document.querySelector('.main-content');
    const editorHeight = elements.timingEditorDiv?.offsetHeight || 0;
    if (mainContent) {
        mainContent.style.paddingBottom = isEditorVisible ? `${editorHeight + 20}px` : '15px';
    }
}

