// app/modules/timingEditorController.js
// Manages the timing editor UI state, interactions, and syncs with LyricsEditor

let UI, PlaybackController, ProjectController, LyricsEditor; 
let isEditing = false;
let autoSelectNextLine = false;
let onLyricsChangedCallback = null; 

export function init(dependencies) {
    UI = dependencies.UI;
    PlaybackController = dependencies.PlaybackController;
    ProjectController = dependencies.ProjectController;
    LyricsEditor = dependencies.LyricsEditor; 
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
     UI.displayLyrics(lyrics, isEditing, LyricsEditor.onLyricTimeFieldClick); 
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
}

export function onSetLineEnd() {
    const currentTime = PlaybackController.getAudioTime();
    LyricsEditor.setCurrentLineEnd(currentTime); 

    if (autoSelectNextLine) {
        const idx = LyricsEditor.getCurrentEditorLineIdx();
        const lyrics = LyricsEditor.getLyrics();
        if (typeof idx === 'number' && idx < lyrics.length - 1) {
            LyricsEditor.updateEditorTarget(idx + 1);
            UI.highlightEditingLine(idx + 1); 
            UI.updateTimingEditorFields(idx + 1); 
        }
    }
}

export function onNudgeStart(delta) {
    LyricsEditor.nudgeCurrentLineStart(delta);
}

export function onNudgeEnd(delta) {
    LyricsEditor.nudgeCurrentLineEnd(delta);
}

export function onClearLineTimes() {
    LyricsEditor.clearCurrentLineTimes();
}

export function onAutoSelectNextChange(event) {
    autoSelectNextLine = event.target.checked;
}

function onTimingChange(newLyricsArr) {
    if (onLyricsChangedCallback) {
        onLyricsChangedCallback(newLyricsArr); 
    }
    syncLyricsDisplay(); 
    UI.updateTimingEditorFields(LyricsEditor.getCurrentEditorLineIdx());
}