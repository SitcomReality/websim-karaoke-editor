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
    lyricsContainer: document.querySelector('.lyrics-container'),
};

let isTimingEditorVisible = false;
let lastLyricsForTimes = [];
let lastLineTimes = null;
let lastCustomOnTimeFieldClick = null;

export function init() {
    updateLayoutPadding(false);
}

export function setTimingEditorVisible(visible) {
    isTimingEditorVisible = visible;
    // Optionally update existing lyrics display
    if (lastLyricsForTimes && lastLyricsForTimes.length) {
        displayLyrics(lastLyricsForTimes, lastLineTimes, lastCustomOnTimeFieldClick);
    }
}

export function setLoading(isLoading, message = "Loading...") {
    elements.loadingOverlay.classList.toggle('active', isLoading);
    elements.loadingMessage.textContent = message;
}

export function updateProjectName(title) {
    elements.songTitle.textContent = title;
}

/**
 * Render the lyrics list. If in timing editor, shows line start/end times.
 * @param {Array} lyrics - Array of lyric lines, each { text, start, end }
 * @param {Function|Array} [lineTimes] - Optional: array of {start, end} (or function for advanced)
 * @param {Function} [onTimeFieldClick] - If provided, called when the lyric-time-field is clicked
 */
export function displayLyrics(lyrics, lineTimes, onTimeFieldClick) {
    // Save arguments for re-render when timing editor mode is toggled
    lastLyricsForTimes = lyrics;
    lastLineTimes = lineTimes;
    lastCustomOnTimeFieldClick = onTimeFieldClick;

    const ul = elements.lyricsList;
    ul.innerHTML = '';
    if (!lyrics || !lyrics.length) {
        const li = document.createElement('li');
        li.textContent = 'No lyrics available.';
        li.className = 'placeholder';
        ul.appendChild(li);
        return;
    }
    ul.classList.toggle('show-times', isTimingEditorVisible);

    lyrics.forEach((line, idx) => {
        const li = document.createElement('li');
        li.dataset.idx = idx;

        if (isTimingEditorVisible) {
            // Timing-edit mode: show times in a left column
            const timeSpan = document.createElement('span');
            timeSpan.className = 'lyric-time-field';
            timeSpan.textContent = formatLineTimes(line);

            // Make time span clickable if callback provided
            if (typeof onTimeFieldClick === 'function') {
                timeSpan.style.cursor = 'pointer';
                timeSpan.title = 'Click to edit timing';
                timeSpan.addEventListener('click', function(evt) {
                    evt.stopPropagation();
                    onTimeFieldClick(evt);
                });
            }

            li.appendChild(timeSpan);
        }

        // Lyric text span (preserves alignment if time column is present)
        const textSpan = document.createElement('span');
        textSpan.className = 'lyric-line-text';
        textSpan.textContent = line.text || '';
        // DO NOT set pointer-events:none so line can be clicked (for editing)
        // The text span should allow click to bubble (default)
        li.appendChild(textSpan);
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

export function formatTime(val) {
    if (val == null || isNaN(val)) return '0:00';
    const min = Math.floor(val / 60);
    const sec = Math.floor(val % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function formatLineTimes(line) {
    // Returns "[mm:ss]-[mm:ss]" or "[mm:ss]" or "--:--" if no info
    if (typeof line.start === "number" && !isNaN(line.start)) {
        const start = formatTime(line.start);
        if (typeof line.end === "number" && !isNaN(line.end)) {
            return `[${start} – ${formatTime(line.end)}]`;
        }
        return `[${start}]`;
    }
    return '[--:--]';
}

export function updateLayoutPadding(isEditorVisible) {
    isTimingEditorVisible = isEditorVisible;
    const mainContent = document.querySelector('.main-content');
    const editorHeight = elements.timingEditorDiv?.offsetHeight || 0;
    if (mainContent) {
        mainContent.style.paddingBottom = isEditorVisible ? `${editorHeight + 20}px` : '15px';
    }
    // Re-render lyrics to show/hide times as needed
    if (lastLyricsForTimes && lastLyricsForTimes.length) {
        displayLyrics(lastLyricsForTimes, lastLineTimes, lastCustomOnTimeFieldClick);
    }
}