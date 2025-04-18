// lyrics.js - Manage lyrics, timing editing, and highlighting

let getAudioTimeCb, onTimingChangeCb;
let lines = [];
let editorEnabled = false;
let currentLineIdx = null;

export function init(getAudioTime, onTimingChange) {
    getAudioTimeCb = getAudioTime;
    onTimingChangeCb = onTimingChange;
}

export function parseLyrics(raw, filenameHint) {
    // Simple LRC or text file parser
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
    return linesArr;
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
    if (e.target.tagName === 'LI' && !e.target.classList.contains('placeholder')) {
        selectEditorLine(parseInt(e.target.dataset.idx, 10));
    }
}
function selectEditorLine(idx) {
    currentLineIdx = idx;
    Array.from(document.getElementById('lyrics-list').children).forEach((li, i) => {
        li.classList.toggle('editing', i === idx);
    });
    // Show start/end time in UI (left for future implementation)
    // Could dispatch event/callback here
}

function clearEditorSelection() {
    currentLineIdx = null;
    Array.from(document.getElementById('lyrics-list').children).forEach((li) => {
        li.classList.remove('editing');
    });
}

export function updateEditorTarget(idx) {
    if (idx === null) clearEditorSelection();
    else selectEditorLine(idx);
}