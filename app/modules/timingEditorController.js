// app/modules/timingEditorController.js
// Manages the timing editor UI state, interactions, and syncs with LyricsEditor

// Keep the direct import of LyricsEditor as it uses it internally
import * as LyricsEditor from './lyricsEditor.js';

let UI, PlaybackController, ProjectController; 
let isEditing = false;
let autoSelectNextLine = false;
let onLyricsChangedCallback = null;

export function init(dependencies) {
    UI = dependencies.UI;
    PlaybackController = dependencies.PlaybackController;
    ProjectController = dependencies.ProjectController;
    // The onLyricsChangedCallback IS ProjectController.updateCurrentProjectLyrics
    // It's used by LyricsEditor to update the central project data.
    onLyricsChangedCallback = dependencies.onLyricsChanged;

    const autoSelectCheckbox = document.getElementById('auto-select-next-line');
    if (autoSelectCheckbox) {
        autoSelectNextLine = autoSelectCheckbox.checked;
        autoSelectCheckbox.addEventListener('change', (event) => {
             onAutoSelectNextChange(event);
        });
    }

    // Pass the callback to LyricsEditor so it can notify ProjectController
    LyricsEditor.setOnTimingChangeCallback(onLyricsChangedCallback);
}

export function isEditorVisible() {
    return isEditing;
}

export function toggleTimingEditor() {
    isEditing = !isEditing;
    UI.elements.timingEditorDiv.style.display = isEditing ? 'block' : 'none';
    UI.elements.toggleEditorButton.textContent = isEditing ? 'Hide Timing Editor' : 'Show Timing Editor';
    UI.setTimingEditorVisible(isEditing); 

    if (isEditing) {
        UI.elements.lyricsList.classList.add('editable');
        LyricsEditor.enableEditing();
        syncLyricsDisplay(); 
    } else {
        UI.elements.lyricsList.classList.remove('editable');
        LyricsEditor.disableEditing();
        syncLyricsDisplay(); 
    }

    UI.updateLayoutPadding(isEditing);
    if (!isEditing) {
        LyricsEditor.updateEditorTarget(null);
        UI.updateTimingEditorFields(null);
    } else {
        UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx());
    }
}

export function syncLyrics() {
    const lyrics = ProjectController.getCurrentProjectLyrics();
    LyricsEditor.setLyrics(lyrics);
    syncLyricsDisplay();
    UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx());
}

function syncLyricsDisplay() {
     const lyrics = LyricsEditor.getLyrics();
     UI.displayLyrics(lyrics, isEditing, onLyricTimeFieldClick);
     const currentIdx = LyricsEditor.getCurrentEditorLineIdx();
     if (currentIdx !== null) {
         const li = UI.elements.lyricsList.querySelector(`li[data-idx="${currentIdx}"]`);
         if (li) li.classList.add('editing');
     }
      const currentTime = PlaybackController.getAudioTime();
     const currentPlayIdx = LyricsEditor.findLineForTime(currentTime);
     UI.highlightLyric(currentPlayIdx);
}

export function onSetLineStart() {
    const currentTime = PlaybackController.getAudioTime();
    if (LyricsEditor.setCurrentLineStart(currentTime)) {
        syncLyricsDisplay(); // Refresh list view with updated times
        UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));
    }
}

export function onSetLineEnd() {
    const currentTime = PlaybackController.getAudioTime();
    if (LyricsEditor.setCurrentLineEnd(currentTime)) {
        syncLyricsDisplay(); // Refresh list view with updated times
        UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));

        if (autoSelectNextLine) {
            const idx = LyricsEditor.getCurrentEditorLineIdx();
            const lyrics = LyricsEditor.getLyrics();
            if (typeof idx === 'number' && idx < lyrics.length - 1) {
                 // Update target triggers UI updates (highlighting, editor fields)
                 LyricsEditor.updateEditorTarget(idx + 1);
            }
        }
    }
}

export function onNudgeStart(delta) {
    if (LyricsEditor.nudgeCurrentLineStart(delta)) {
        syncLyricsDisplay(); // Refresh list view with updated times
        UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));
    }
}

export function onNudgeEnd(delta) {
    if (LyricsEditor.nudgeCurrentLineEnd(delta)) {
        syncLyricsDisplay(); // Refresh list view with updated times
        UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));
    }
}

export function onClearLineTimes() {
    if (LyricsEditor.clearCurrentLineTimes()) {
        syncLyricsDisplay(); // Refresh list view with updated times
        UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));
    }
}

export function onAutoSelectNextChange(event) {
    autoSelectNextLine = event.target.checked;
}

export function onLyricTimeFieldClick(evt) {
    const li = evt.target.closest('li[data-idx]');
    if (!li || !isEditing) return; // Check if editing is enabled
    const idx = parseInt(li.dataset.idx, 10);
    const line = LyricsEditor.getLineData(idx);

    if (line) {
        // Select the line for editing first, this updates the editor panel display
        LyricsEditor.updateEditorTarget(idx);

        const currentStart = typeof line.start === 'number' ? line.start.toFixed(2) : '';
        const currentEnd = typeof line.end === 'number' ? line.end.toFixed(2) : '';

        const newStartStr = prompt(`Enter start time (seconds) for line ${idx + 1}:\n"${line.text}"`, currentStart);
        if (newStartStr === null) return; // User cancelled start input

        const newEndStr = prompt(`Enter end time (seconds) for line ${idx + 1}:\n"${line.text}"`, currentEnd);
        if (newEndStr === null) return; // User cancelled end input

        // Set times via LyricsEditor, which handles validation and propagation
        LyricsEditor.setLineTimes(idx, newStartStr, newEndStr);

        // Refresh the list display and the timing editor display
        // Note: setLineTimes calls propagateTimingUpdate which calls UI.updateTimingEditorFields
        // So we only need to explicitly refresh the main list display here.
        syncLyricsDisplay();
        // UI.updateTimingEditorFields(idx, LyricsEditor.getLineData(idx)); // This is redundant now
    }
}