// app/modules/timingEditorController.js
// Manages the timing editor UI state, interactions, and syncs with LyricsEditor

import * as LyricsEditor from './lyricsEditor.js'; // Import the actual lyrics logic module

let UI, PlaybackController, ProjectController; // Injected dependencies
let isEditing = false;
let autoSelectNextLine = false;
let onLyricsChangedCallback = null; // Callback to ProjectController

export function init(dependencies) {
    UI = dependencies.UI;
    PlaybackController = dependencies.PlaybackController;
    ProjectController = dependencies.ProjectController;
    onLyricsChangedCallback = dependencies.onLyricsChanged;

    // Initialize LyricsEditor with necessary callbacks/dependencies
    // Use PlaybackController to get current time
    LyricsEditor.init(PlaybackController.getAudioTime, onTimingChange);

    // Initial state from checkbox
    const autoSelectCheckbox = document.getElementById('auto-select-next-line');
    if (autoSelectCheckbox) {
        autoSelectNextLine = autoSelectCheckbox.checked;
    }
}

// Provides access to the underlying LyricsEditor module if needed elsewhere
export function getLyricsEditorModule() {
    return LyricsEditor;
}

export function isEditorVisible() {
    return isEditing;
}

export function toggleTimingEditor() {
    isEditing = !isEditing;
    UI.elements.timingEditorDiv.style.display = isEditing ? 'block' : 'none';
    UI.elements.toggleEditorButton.textContent = isEditing ? 'Hide Timing Editor' : 'Show Timing Editor';

    if (isEditing) {
        UI.elements.lyricsList.classList.add('editable');
        LyricsEditor.enableEditing(); // Enable line selection clicks in LyricsEditor
        // Ensure current lyrics are displayed with times
        syncLyricsDisplay();
    } else {
        UI.elements.lyricsList.classList.remove('editable');
        LyricsEditor.disableEditing(); // Disable line selection clicks
        // Ensure current lyrics are displayed without times
        syncLyricsDisplay();
    }

    // Update UI layout potentially affecting padding
    UI.updateLayoutPadding(isEditing);
    // Reset selection when toggling editor off
    if (!isEditing) {
        LyricsEditor.updateEditorTarget(null);
    }
}

// Called when project changes or editor toggled
export function syncLyrics() {
    const lyrics = ProjectController.getCurrentProjectLyrics();
    LyricsEditor.setLyrics(lyrics); // Update internal lyrics in LyricsEditor
    syncLyricsDisplay(); // Update the visual list
}

function syncLyricsDisplay() {
     const lyrics = LyricsEditor.getLyrics(); // Get potentially modified lyrics
     UI.displayLyrics(lyrics, isEditing, onLyricTimeFieldClick); // Re-render list, showing/hiding times
     // Re-apply editing class if a line is selected
     const currentIdx = LyricsEditor.getCurrentEditorLineIdx();
     if (currentIdx !== null) {
         const li = UI.elements.lyricsList.querySelector(`li[data-idx="${currentIdx}"]`);
         if (li) li.classList.add('editing');
     }
      // Re-apply current class based on playback time
     const currentTime = PlaybackController.getAudioTime();
     const currentPlayIdx = LyricsEditor.findLineForTime(currentTime);
     UI.highlightLyric(currentPlayIdx);
}


// --- Timing Controls Event Handlers ---

export function onSetLineStart() {
    const currentTime = PlaybackController.getAudioTime();
    LyricsEditor.setCurrentLineStart(currentTime);
    // No need to call syncLyricsDisplay here, onTimingChange handles it
}

export function onSetLineEnd() {
    const currentTime = PlaybackController.getAudioTime();
    LyricsEditor.setCurrentLineEnd(currentTime);

    if (autoSelectNextLine) {
        const idx = LyricsEditor.getCurrentEditorLineIdx();
        const lyrics = LyricsEditor.getLyrics();
        if (typeof idx === 'number' && idx < lyrics.length - 1) {
            LyricsEditor.updateEditorTarget(idx + 1); // Select next line in editor
        }
    }
     // No need to call syncLyricsDisplay here,


export function onLyricTimeFieldClick(evt) {
    // Only act if click was on a .lyric-time-field
    const target = evt.target;
    if (!target.classList.contains('lyric-time-field')) return;
    const li = target.closest('li');
    if (!li) return;
    const idx = parseInt(li.dataset.idx, 10);

    // Get line info
    const line = LyricsEditor.getLyrics()[idx];
    // Open prompt for editing: show both start/end, prefilled, mm:ss format
    const startStr = typeof line.start === 'number' ? LyricsEditor.formatTime(line.start) : '';
    const endStr = typeof line.end === 'number' ? LyricsEditor.formatTime(line.end) : '';

    let input = prompt(
      `Edit timings for this line:\n[format: mm:ss or ss.ss, separate start & end with "-"]\nLeave blank to unset a value.\n\nCurrent: [${startStr}] – [${endStr}]`,
      startStr && endStr ? `${startStr}-${endStr}` : startStr || endStr
    );
    if (input === null) return;

    input = input.trim();
    let newStart = line.start, newEnd = line.end;
    let error = null;

    // Parse input
    function parseTimeField(str) {
        if (!str || str === '--:--') return null;
        if (/^\d+:\d{1,2}(\.\d+)?$/.test(str)) {
            const [min, sec] = str.split(':');
            return Number(min) * 60 + Number(sec);
        } else if (/^\d+(\.\d+)?$/.test(str)) {
            return Number(str);
        } else {
            return null;
        }
    }
    let vals = input.split('-');
    if (vals.length === 2) {
        newStart = parseTimeField(vals[0].trim());
        newEnd = parseTimeField(vals[1].trim());
    } else if (vals.length === 1) {
        // If only one, overwrite start, clear end (if blank)
        newStart = parseTimeField(vals[0].trim());
        if (vals[0].trim() === '') newStart = null;
        newEnd = null;
    }

    // Constrain: start >= 0, end > start, end <= start of next line
    const prevEnd = idx > 0 && typeof LyricsEditor.getLyrics()[idx - 1].end === 'number' ? LyricsEditor.getLyrics()[idx - 1].end : undefined;
    const nextStart = idx < LyricsEditor.getLyrics().length - 1 && typeof LyricsEditor.getLyrics()[idx + 1].start === 'number' ? LyricsEditor.getLyrics()[idx + 1].start : undefined;

    if (typeof newStart === 'number' && newStart < 0) newStart = 0;
    if (typeof newEnd === 'number' && typeof newStart === 'number' && newEnd <= newStart) error = 'End time must be after start time!';
    if (typeof nextStart === 'number' && typeof newEnd === 'number' && newEnd > nextStart)
        error = `End time must not exceed start of next line (${LyricsEditor.formatTime(nextStart)})!`;

    if (error) {
        alert(error);
        return;
    }

    LyricsEditor.setLineTimes(idx, newStart, newEnd);

    // When editing times, always select the current line in UI for user feedback
    LyricsEditor.updateEditorTarget(idx);
    UI.highlightLyric(idx);
    syncLyricsDisplay();
}

function onTimingChange(newLyricsArr) {
    if (onLyricsChangedCallback) {
        onLyricsChangedCallback(newLyricsArr);
    }
    syncLyricsDisplay();
}