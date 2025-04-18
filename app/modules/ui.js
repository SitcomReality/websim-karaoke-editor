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
    playPauseButton: document.getElementById('play-pause'),
    prevSongButton: document.getElementById('prev-song'),
    nextSongButton: document.getElementById('next-song'),
    volumeSlider: document.getElementById('volume-slider'),
    progressBar: document.getElementById('progress-bar'),
    currentTimeLabel: document.getElementById('current-time'),
    durationLabel: document.getElementById('duration'),
    setLineStartButton: document.getElementById('set-line-start'),
    setLineEndButton: document.getElementById('set-line-end'),
    nudgeStartBackButton: document.getElementById('nudge-start-back'),
    nudgeStartForwardButton: document.getElementById('nudge-start-forward'),
    nudgeEndBackButton: document.getElementById('nudge-end-back'),
    nudgeEndForwardButton: document.getElementById('nudge-end-forward'),
    clearLineTimesButton: document.getElementById('clear-line-times'),
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
    if (!lyrics || !lyrics.length) {
        const li = document.createElement('li');
        li.textContent = 'No lyrics available.';
        li.className = 'placeholder';
        ul.appendChild(li);
        return;
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

export function highlightLyric(idx) {
    Array.from(elements.lyricsList.children).forEach((li, i) => {
        li.classList.toggle('current', i === idx);
    });
}

export function resetProgressBar() {
    if (elements.progressBar) {
        elements.progressBar.value = 0;
    }
    if (elements.currentTimeLabel) elements.currentTimeLabel.textContent = '0:00';
    if (elements.durationLabel) elements.durationLabel.textContent = '0:00';
}

export function updateProgressBar(currentTime = 0, duration = 0) {
    if (elements.progressBar) {
        elements.progressBar.max = duration || 0;
        elements.progressBar.value = currentTime || 0;
    }
    if (elements.currentTimeLabel) elements.currentTimeLabel.textContent = formatTime(currentTime);
    if (elements.durationLabel) elements.durationLabel.textContent = formatTime(duration);
}

// Helper for formatting time
export function formatTime(val) {
    return requireFormatTime(val);
}
function requireFormatTime(val) {
    if (val == null || isNaN(val)) return '0:00';
    const min = Math.floor(val / 60);
    const sec = Math.floor(val % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

export function updateLayoutPadding(isEditorVisible) {
    const mainContent = document.querySelector('.main-content');
    const editorHeight = elements.timingEditorDiv?.offsetHeight || 0;
    if (mainContent) {
        mainContent.style.paddingBottom = isEditorVisible ? `${editorHeight + 20}px` : '15px';
    }
}