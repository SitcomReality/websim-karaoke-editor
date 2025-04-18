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
    selectedLineStartLabel: document.getElementById('selected-line-start'),
    selectedLineEndLabel: document.getElementById('selected-line-end'),
    setLineStartButton: document.getElementById('set-line-start'),
    setLineEndButton: document.getElementById('set-line-end'),
    nudgeStartBackButton: document.getElementById('nudge-start-back'),
    nudgeStartForwardButton: document.getElementById('nudge-start-forward'),
    nudgeEndBackButton: document.getElementById('nudge-end-back'),
    nudgeEndForwardButton: document.getElementById('nudge-end-forward'),
    clearLineTimesButton: document.getElementById('clear-line-times'),
    lyricsContainer: document.querySelector('.lyrics-container'),
    colorBgInput: document.getElementById('color-bg'),
    colorTextInput: document.getElementById('color-text'),
    colorHighlightBgInput: document.getElementById('color-highlight-bg'),
    colorHighlightTextInput: document.getElementById('color-highlight-text'),
};

let isTimingEditorVisible = false;
let lastLyricsForTimes = [];
let lastCustomOnTimeFieldClick = null;

export function init() {
    updateLayoutPadding(false);
}

export function setTimingEditorVisible(visible) {
    isTimingEditorVisible = visible;
    if (lastLyricsForTimes && lastLyricsForTimes.length) {
        displayLyrics(lastLyricsForTimes, isTimingEditorVisible, lastCustomOnTimeFieldClick);
    }
}

export function setLoading(isLoading, message = "Loading...") {
    elements.loadingOverlay.classList.toggle('active', isLoading);
    elements.loadingMessage.textContent = message;
}

export function updateProjectName(title) {
    elements.songTitle.textContent = title;
}

export function displayLyrics(lyrics, showTimes, onTimeFieldClick) {
    lastLyricsForTimes = lyrics;
    lastCustomOnTimeFieldClick = onTimeFieldClick;
    isTimingEditorVisible = showTimes;

    const ul = elements.lyricsList;
    ul.innerHTML = '';
    if (!lyrics || !lyrics.length) {
        const li = document.createElement('li');
        li.textContent = 'No lyrics available.';
        li.className = 'placeholder';
        ul.appendChild(li);
        return;
    }
    ul.classList.toggle('show-times', showTimes);

    lyrics.forEach((line, idx) => {
        const li = document.createElement('li');
        li.dataset.idx = idx;

        if (showTimes) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'lyric-time-field';
            timeSpan.textContent = formatLineTimes(line);

            if (typeof onTimeFieldClick === 'function') {
                timeSpan.title = 'Click to edit timing';
                timeSpan.addEventListener('click', (evt) => {
                    evt.stopPropagation();
                    onTimeFieldClick(evt);
                });
            }

            li.appendChild(timeSpan);
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'lyric-line-text';
        textSpan.textContent = line.text || '';
        li.appendChild(textSpan);
        ul.appendChild(li);
    });

    // Re-apply editing highlight if needed (e.g., after redraw)
    // Find the currently edited line index from LyricsEditor (need access or state)
    // For now, let's assume highlightEditingLine will be called separately when needed.
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
    const lis = elements.lyricsList.children;
    for (let i = 0; i < lis.length; i++) {
        const isCurrent = i === idx;
        if (lis[i].classList.contains('current') !== isCurrent) {
            lis[i].classList.toggle('current', isCurrent);
        }
        if (isCurrent && elements.lyricsContainer) {
            const containerRect = elements.lyricsContainer.getBoundingClientRect();
            const lineRect = lis[i].getBoundingClientRect();

            if (lineRect.bottom < containerRect.top + 30 || lineRect.top > containerRect.bottom - 30) {
                lis[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}

export function highlightEditingLine(idx) {
    Array.from(elements.lyricsList.children).forEach((li, i) => {
        const elementIdx = li.dataset.idx ? parseInt(li.dataset.idx, 10) : -1;
        li.classList.toggle('editing', elementIdx === idx);
    });

    if (idx !== null && elements.lyricsContainer) {
        const lineElement = elements.lyricsList.querySelector(`li[data-idx="${idx}"]`);
        if (lineElement) {
            const containerRect = elements.lyricsContainer.getBoundingClientRect();
            const lineRect = lineElement.getBoundingClientRect();

            if (lineRect.bottom < containerRect.top + (containerRect.height * 0.1) || lineRect.top > containerRect.bottom - (containerRect.height * 0.1)) {
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}

export function resetProgressBar() {
    if (elements.progressBar) {
        elements.progressBar.value = 0;
        elements.progressBar.max = 0;
    }
    if (elements.currentTimeLabel) elements.currentTimeLabel.textContent = '0:00';
    if (elements.durationLabel) elements.durationLabel.textContent = '0:00';
}

export function updateProgressBar(currentTime = 0, duration = 0) {
    const validDuration = (typeof duration === 'number' && !isNaN(duration) && duration > 0) ? duration : 0;
    const validCurrentTime = (typeof currentTime === 'number' && !isNaN(currentTime)) ? currentTime : 0;

    if (elements.progressBar) {
        elements.progressBar.max = validDuration;
        elements.progressBar.value = Math.min(validCurrentTime, validDuration);
    }
    if (elements.currentTimeLabel) elements.currentTimeLabel.textContent = formatTime(validCurrentTime);
    if (elements.durationLabel) elements.durationLabel.textContent = formatTime(validDuration);
}

export function updateTimingEditorFields(idx, lineData) {
    const startLabel = elements.selectedLineStartLabel;
    const endLabel = elements.selectedLineEndLabel;
    const hasData = idx !== null && lineData;

    if (startLabel) {
        startLabel.textContent = hasData ? formatTime(lineData.start) : '--:--';
    }
    if (endLabel) {
        endLabel.textContent = hasData ? formatTime(lineData.end) : '--:--';
    }

    const editorButtons = [
        elements.setLineStartButton, elements.setLineEndButton,
        elements.nudgeStartBackButton, elements.nudgeStartForwardButton,
        elements.nudgeEndBackButton, elements.nudgeEndForwardButton,
        elements.clearLineTimesButton
    ];
    editorButtons.forEach(btn => {
        if (btn) btn.disabled = !hasData;
    });
}

export function formatTime(val) {
    if (val === null || typeof val !== 'number' || isNaN(val)) return '--:--';
    const totalSeconds = Math.max(0, val);
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.floor(totalSeconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function formatLineTimes(line) {
    if (!line) return '[--:--]';
    const startStr = formatTime(line.start);
    const endStr = formatTime(line.end);

    if (startStr !== '--:--') {
        if (endStr !== '--:--') {
            return `[${startStr} - ${endStr}]`;
        }
        return `[${startStr}]`;
    }
    return '[--:--]';
}

export function updateLayoutPadding(isEditorVisible) {
    const mainContent = document.querySelector('.main-content');
    const editorHeight = elements.timingEditorDiv?.offsetHeight || 0;
    if (mainContent) {
        mainContent.style.paddingBottom = isTimingEditorVisible ? `${editorHeight + 20}px` : '15px';
    }
}

export function updateThemeInputs(theme) {
    if (elements.colorBgInput) elements.colorBgInput.value = theme.background || '#f0f0f0';
    if (elements.colorTextInput) elements.colorTextInput.value = theme.text || '#333333';
    if (elements.colorHighlightBgInput) elements.colorHighlightBgInput.value = theme.highlightBg || '#ffff99';
    if (elements.colorHighlightTextInput) elements.colorHighlightTextInput.value = theme.highlightText || '#000000';
}