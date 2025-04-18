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
    onLyricsChangedCallback = dependencies.onLyricsChanged;

    const autoSelectCheckbox = document.getElementById('auto-select-next-line');
    if (autoSelectCheckbox) {
        autoSelectNextLine = autoSelectCheckbox.checked;
        autoSelectCheckbox.addEventListener('change', (event) => {
             onAutoSelectNextChange(event);
        });
    }
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
    LyricsEditor.setCurrentLineStart(currentTime);
    UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));
}

export function onSetLineEnd() {
    const currentTime = PlaybackController.getAudioTime();
    LyricsEditor.setCurrentLineEnd(currentTime);
    UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));


    if (autoSelectNextLine) {
        const idx = LyricsEditor.getCurrentEditorLineIdx();
        const lyrics = LyricsEditor.getLyrics();
        if (typeof idx === 'number' && idx < lyrics.length - 1) {
            LyricsEditor.updateEditorTarget(idx + 1);
            UI.highlightEditingLine(idx + 1);
            UI.updateTimingEditorFields(idx + 1, LyricsEditor.getLineData(idx + 1));
        }
    }
}

export function onNudgeStart(delta) {
    LyricsEditor.nudgeCurrentLineStart(delta);
    UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));
}

export function onNudgeEnd(delta) {
    LyricsEditor.nudgeCurrentLineEnd(delta);
    UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));
}

export function onClearLineTimes() {
    LyricsEditor.clearCurrentLineTimes();
    UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx(), LyricsEditor.getLineData(LyricsEditor.getCurrentEditorLineIdx()));

}

export function onAutoSelectNextChange(event) {
    autoSelectNextLine = event.target.checked;
}

export function onLyricTimeFieldClick(evt) {
    const li = evt.target.closest('li[data-idx]');
    if (!li) return;
    const idx = parseInt(li.dataset.idx, 10);
    const line = LyricsEditor.getLineData(idx); 

    if (line) {
        LyricsEditor.updateEditorTarget(idx);

        const currentStart = typeof line.start === 'number' ? line.start.toFixed(2) : '';
        const currentEnd = typeof line.end === 'number' ? line.end.toFixed(2) : '';

        const newStartStr = prompt(`Enter start time (seconds) for line ${idx + 1}:\n"${line.text}"`, currentStart);
        if (newStartStr === null) return; 

        const newEndStr = prompt(`Enter end time (seconds) for line ${idx + 1}:\n"${line.text}"`, currentEnd);
        if (newEndStr === null) return; 

        LyricsEditor.setLineTimes(idx, newStartStr, newEndStr);

        if (onLyricsChangedCallback) {
            onLyricsChangedCallback(LyricsEditor.getLyrics());
        }
        syncLyricsDisplay();
        UI.updateTimingEditorFields(idx, LyricsEditor.getLineData(idx));
    }
}