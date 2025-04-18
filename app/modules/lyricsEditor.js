// app/modules/lyricsEditor.js

let getAudioTimeCb, onTimingChangeCb;
let editorEnabled = false;
let currentLineIdx = null;
let lyrics = []; // The lyrics array with timing

export function init(getAudioTime, onTimingChange) {
    getAudioTimeCb = getAudioTime;
    onTimingChangeCb = onTimingChange;
}

export function parseLyrics(raw, filenameHint) {
    const linesArr = [];
    const linesRaw = raw.split(/\r?\n/).filter(l => l.trim() !== '');
    const lrcPattern = /^\[(\d{1,2}):([\d.]+)](.*)$/;
    let isLRC = linesRaw.some(l => lrcPattern.test(l));
    linesRaw.forEach(line => {
        if (isLRC) {
            const m = lrcPattern.exec(line);
            if (m) {
                linesArr.push({
                    text: m[3].trim(),
                    start: parseFloat(m[1]) * 60 + parseFloat(m[2]),
                    end: null
                });
            }
        } else {
            linesArr.push({ text: line.trim(), start: null, end: null });
        }
    });
    lyrics = linesArr;
    return linesArr;
}

export function setLyrics(lyricArr) {
    lyrics = lyricArr || [];
}

export function getLyrics() {
    return lyrics;
}

export function findCurrentLineIdx(currentTime) {
    if (!lyrics || lyrics.length === 0) return null;
    let idx = null;
    for (let i = 0; i < lyrics.length; i++) {
        const line = lyrics[i];
        // Both start/end must exist
        if (typeof line.start === 'number' && typeof line.end === 'number') {
            if (currentTime >= line.start && currentTime < line.end) {
                idx = i;
                break;
            }
        } else if (typeof line.start === 'number' && typeof line.end !== 'number') {
            // Support: highlight if last timed line with no end
            if (currentTime >= line.start && (i === lyrics.length - 1 || typeof lyrics[i + 1].start !== 'number')) {
                idx = i;
                break;
            }
        }
    }
    return idx;
}

export function findLineForTime(currentTime) {
    return findCurrentLineIdx(currentTime);
}

export function enableEditing() {
    editorEnabled = true;
    document.getElementById('lyrics-list').addEventListener('click', onLyricClick);
}

export function disableEditing() {
    editorEnabled = false;
    document.getElementById('lyrics-list').removeEventListener('click', onLyricClick);
    clearEditorSelection();
}

function onLyricClick(e) {
    if (!editorEnabled) return;
    // Prioritize lyric-line-text for selection, but allow clicking timefield as handled elsewhere
    const li = e.target.closest('li');
    if (li && !li.classList.contains('placeholder') && typeof li.dataset.idx !== 'undefined') {
        selectEditorLine(parseInt(li.dataset.idx, 10));
    }
}

function selectEditorLine(idx) {
    currentLineIdx = idx;
    Array.from(document.getElementById('lyrics-list').children).forEach((li, i) => {
        li.classList.toggle('editing', i === idx);
    });
    updateTimingEditorFields(idx);
}

function clearEditorSelection() {
    currentLineIdx = null;
    Array.from(document.getElementById('lyrics-list').children).forEach((li) => {
        li.classList.remove('editing');
    });
    updateTimingEditorFields(null);
}

export function updateEditorTarget(idx) {
    if (idx === null) clearEditorSelection();
    else selectEditorLine(idx);
}

export function getCurrentEditorLineIdx() {
    return currentLineIdx;
}

// Timing editing controls

export function setCurrentLineStart(time) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return;
    let nextStart = (currentLineIdx < lyrics.length - 1 && typeof lyrics[currentLineIdx + 1].start === 'number')
        ? lyrics[currentLineIdx + 1].start : undefined;

    lyrics[currentLineIdx].start = sanitizeTime(time);

    // Only allow end <= next line start
    if (typeof lyrics[currentLineIdx].end === 'number' && typeof nextStart === 'number' && lyrics[currentLineIdx].end > nextStart) {
        lyrics[currentLineIdx].end = nextStart;
    }
    if (typeof lyrics[currentLineIdx].end !== 'number' || lyrics[currentLineIdx].end < lyrics[currentLineIdx].start) {
        lyrics[currentLineIdx].end = lyrics[currentLineIdx].start + 1; // 1s default
    }
    propagateTimingUpdate();
}

export function setCurrentLineEnd(time) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return;
    let nextStart = (currentLineIdx < lyrics.length - 1 && typeof lyrics[currentLineIdx + 1].start === 'number')
        ? lyrics[currentLineIdx + 1].start : undefined;
    time = sanitizeTime(time);

    // Clamp end <= next line start (if timing exists for next)
    if (typeof nextStart === 'number' && time > nextStart)
        time = nextStart;
    // Ensure end >= start+epsilon
    if (typeof lyrics[currentLineIdx].start === 'number' && time <= lyrics[currentLineIdx].start)
        time = lyrics[currentLineIdx].start + 0.01;

    lyrics[currentLineIdx].end = time;

    // Optionally: Set start of next line
    if (currentLineIdx < lyrics.length - 1) {
        if (!lyrics[currentLineIdx + 1].start || lyrics[currentLineIdx + 1].start < time) {
            lyrics[currentLineIdx + 1].start = time;
        }
    }
    propagateTimingUpdate();
}

/**
 * Set both start and end times for a specific lyric line.
 * Constrain to avoid overlap with next line.
 */
export function setLineTimes(idx, start, end) {
    if (!lyrics[idx]) return;
    const prevEnd = idx > 0 && typeof lyrics[idx - 1].end === 'number' ? lyrics[idx - 1].end : undefined;
    const nextStart = idx < lyrics.length - 1 && typeof lyrics[idx + 1].start === 'number' ? lyrics[idx + 1].start : undefined;

    if (typeof start === 'number' && start < 0) start = 0;
    if (typeof end === 'number' && typeof start === 'number' && end <= start)
        end = start + 0.01;
    if (typeof nextStart === 'number' && typeof end === 'number' && end > nextStart)
        end = nextStart;
    lyrics[idx].start = (typeof start === 'number' ? start : null);
    lyrics[idx].end = (typeof end === 'number' ? end : null);

    propagateTimingUpdate();
}

export function nudgeCurrentLineStart(delta) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return;
    const line = lyrics[currentLineIdx];
    let newStart = sanitizeTime((line.start || 0) + delta);
    // Do not allow newStart >= end or < 0
    if (typeof line.end === 'number' && newStart >= line.end)
        newStart = line.end - 0.01;
    if (newStart < 0) newStart = 0;
    line.start = newStart;
    propagateTimingUpdate();
}

export function nudgeCurrentLineEnd(delta) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return;
    const line = lyrics[currentLineIdx];
    let newEnd = sanitizeTime((line.end || (line.start || 0) + 0.1) + delta);
    // Do not allow end before start
    if (typeof line.start === 'number' && newEnd <= line.start)
        newEnd = line.start + 0.01;
    // Also, not after next line start
    if (currentLineIdx < lyrics.length - 1 &&
        typeof lyrics[currentLineIdx + 1].start === 'number' &&
        newEnd > lyrics[currentLineIdx + 1].start) {
        newEnd = lyrics[currentLineIdx + 1].start;
    }
    line.end = newEnd;
    propagateTimingUpdate();
}

export function clearCurrentLineTimes() {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return;
    lyrics[currentLineIdx].start = null;
    lyrics[currentLineIdx].end = null;
    propagateTimingUpdate();
}

// For displaying time in min:sec format
export function formatTime(val) {
    if (val == null || isNaN(val)) return '--:--';
    const min = Math.floor(val / 60);
    const sec = Math.floor(val % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Show the selected line's times in the editor UI
function updateTimingEditorFields(idx) {
    const startEl = document.getElementById('selected-line-start');
    const endEl = document.getElementById('selected-line-end');
    if (idx == null || !lyrics[idx]) {
        startEl.textContent = '--:--';
        endEl.textContent = '--:--';
    } else {
        startEl.textContent = formatTime(lyrics[idx].start);
        endEl.textContent = formatTime(lyrics[idx].end);
    }
}

// Timing change notification for storage/UI
function propagateTimingUpdate() {
    // Save/notify as appropriate
    if (onTimingChangeCb) onTimingChangeCb(lyrics.slice());
    // Also update the time fields for the currently selected line
    updateTimingEditorFields(currentLineIdx);
}

function sanitizeTime(val) {
    let num = Number(val);
    if (!isFinite(num) || isNaN(num)) return null;
    if (num < 0) num = 0;
    return num;
}