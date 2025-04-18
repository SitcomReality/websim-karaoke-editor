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
    timingEditorDiv: document.getElementById('footer-timing-editor'),
    controlsContainer: document.getElementById('footer-controls'),
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
    footerContainer: document.getElementById('footer-root'),
    footerTimingEditor: document.getElementById('footer-timing-editor'),
    footerControls: document.getElementById('footer-controls'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('toggle-sidebar'),
    mainContentFrame: document.getElementById('main-content-frame'),
};

let isTimingEditorVisible = false;
let lastLyricsForTimes = [];
let lastCustomOnTimeFieldClick = null;

/**
 * Helper: Scrolls a given <li> inside the lyricsContainer so that it's always visible
 * and tries to keep it vertically centered.
 */
function scrollLyricIntoView(li) {
    const container = elements.lyricsContainer;
    if (!li || !container) return;

    // Top of the container relative to the document
    const containerRect = container.getBoundingClientRect();
    const liRect = li.getBoundingClientRect();

    // Offset of li within lyricsContainer
    const liOffsetTop = li.offsetTop;
    const liHeight = li.offsetHeight;
    const containerHeight = container.clientHeight;

    // Calculate new scrollTop so li will be vertically centered
    let desiredScrollTop = liOffsetTop - containerHeight / 2 + liHeight / 2;

    // Clamp desired scrollTop between 0 and maximum scroll
    desiredScrollTop = Math.max(0, Math.min(desiredScrollTop, container.scrollHeight - containerHeight));

    // Only scroll if needed to reduce jank
    // But always try to scroll if the li is out of view
    const liTopInContainer = liOffsetTop;
    const liBottomInContainer = liOffsetTop + liHeight;
    const visibleTop = container.scrollTop;
    const visibleBottom = visibleTop + containerHeight;

    let needScroll = false;
    // If li is below the visible area
    if (liBottomInContainer > visibleBottom - 12) needScroll = true;
    // If li is above the visible area
    if (liTopInContainer < visibleTop + 12) needScroll = true;
    // If the highlighted line is not centered enough, try to center it more aggressively
    const currentCenter = visibleTop + containerHeight / 2;
    const liCenter = liTopInContainer + liHeight / 2;
    // If the line is far from center (>30px), scroll toward center
    if (Math.abs(liCenter - currentCenter) > 30) needScroll = true;

    if (needScroll) {
        container.scrollTo({
            top: desiredScrollTop,
            behavior: 'smooth'
        });
    }
}

export function init() {
    updateLayoutPadding(false);

    // Sidebar toggle button: UX slide in/out
    if (elements.sidebar && elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', () => {
            const collapsed = elements.sidebar.classList.toggle('collapsed');
            handleSidebarStateForLayout(collapsed);
        });
    }
    // Responsive: Auto-collapse sidebar on small screens after navigation
    window.addEventListener('resize', () => {
        if (window.innerWidth < 800 && !elements.sidebar.classList.contains('collapsed')) {
            elements.sidebar.classList.add('collapsed');
            handleSidebarStateForLayout(true);
        }
    });
    // Start in collapsed mode for mobile
    if(window.innerWidth<800) elements.sidebar?.classList.add('collapsed');
    handleSidebarStateForLayout(elements.sidebar?.classList.contains('collapsed'));
}

function handleSidebarStateForLayout(collapsed) {
    if (collapsed) {
        elements.mainContentFrame?.classList.add('sidebar-collapsed');
        // Optionally: ARIA attr for access
        elements.sidebarToggle?.setAttribute('aria-expanded', 'false');
    } else {
        elements.mainContentFrame?.classList.remove('sidebar-collapsed');
        elements.sidebarToggle?.setAttribute('aria-expanded', 'true');
    }
    // Update layout padding just in case
    updateLayoutPadding(isTimingEditorVisible);
}

export function setTimingEditorVisible(visible) {
    isTimingEditorVisible = visible;
    if (elements.footerTimingEditor) {
        elements.footerTimingEditor.style.display = visible ? 'block' : 'none';
    }
    if (lastLyricsForTimes && lastLyricsForTimes.length) {
        displayLyrics(lastLyricsForTimes, isTimingEditorVisible, lastCustomOnTimeFieldClick);
    }
    updateLayoutPadding(isTimingEditorVisible);
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

        // Allow li to be clicked everywhere, including text
        const textSpan = document.createElement('span');
        textSpan.className = 'lyric-line-text';
        textSpan.textContent = line.text || '';
        // pointer-events: auto - clicks propagate naturally now
        textSpan.style.pointerEvents = 'auto';
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
    const lis = elements.lyricsList.children;
    let targetLi = null;
    for (let i = 0; i < lis.length; i++) {
        const isCurrent = i === idx;
        if (lis[i].classList.contains('current') !== isCurrent) {
            lis[i].classList.toggle('current', isCurrent);
        }
        if (isCurrent) targetLi = lis[i];
    }
    // Improved: Always ensure highlighted line is visible and vertically centered if possible
    if (typeof idx === 'number' && idx >= 0 && elements.lyricsContainer) {
        const currentLi = elements.lyricsList.querySelector(`li[data-idx="${idx}"]`);
        if (currentLi) {
            scrollLyricIntoView(currentLi);
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
            scrollLyricIntoView(lineElement);
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

export function updateLayoutPadding(isEditorVisible) {
    // ensure main-content isn't behind the footer, regardless of height of controls/timing
    const mainContent = elements.mainContentFrame;
    const footerTimingEditor = elements.footerTimingEditor;
    const footerControls = elements.footerControls;

    let totalFooterHeight = 0;
    if (footerControls) {
        totalFooterHeight += footerControls.offsetHeight;
    }
    if (isEditorVisible && footerTimingEditor && footerTimingEditor.style.display !== 'none') {
        totalFooterHeight += footerTimingEditor.offsetHeight;
    }
    if (totalFooterHeight < 80) { 
        totalFooterHeight = isEditorVisible
            ? 170 + 92 
            : 92;     
    }
    if (mainContent) {
        mainContent.style.paddingBottom = totalFooterHeight + 'px';
    }
}

export function updateThemeInputs(theme) {
    if (elements.colorBgInput) elements.colorBgInput.value = theme.background || '#f0f0f0';
    if (elements.colorTextInput) elements.colorTextInput.value = theme.text || '#333333';
    if (elements.colorHighlightBgInput) elements.colorHighlightBgInput.value = theme.highlightBg || '#ffff99';
    if (elements.colorHighlightTextInput) elements.colorHighlightTextInput.value = theme.highlightText || '#000000';
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