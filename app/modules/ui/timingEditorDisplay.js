// app/modules/ui/timingEditorDisplay.js
// Handles the display state of the timing editor panel and its fields.

import { elements } from './elements.js';
import { displayLyrics } from '../ui.js';
import { updateLayoutPadding } from '../ui.js';
import { formatTime } from '../ui.js'; // Needs time formatting


/**
 * Shows or hides the timing editor panel and updates related UI.
 * @param {boolean} visible - Whether the timing editor should be visible.
 * @param {Array} lyrics - The current lyrics array to potentially re-render.
 * @param {function} onTimeFieldClick - The callback function for time field clicks.
 */
export function setTimingEditorVisible(visible, lyrics, onTimeFieldClick) {
    if (elements.footerTimingEditor) {
        elements.footerTimingEditor.style.display = visible ? 'block' : 'none';
    }
    // Re-render lyrics with or without time fields based on editor visibility
    displayLyrics(lyrics, visible, onTimeFieldClick);
    // Update main content padding based on the new footer height
    updateLayoutPadding(visible);
}


/**
 * Updates the start/end time labels and button states in the timing editor panel.
 * @param {number|null} idx - The index of the currently selected line for editing, or null.
 * @param {object|null} lineData - The data object for the selected line ({start, end}), or null.
 */
export function updateTimingEditorFields(idx, lineData) {
    const startLabel = elements.selectedLineStartLabel;
    const endLabel = elements.selectedLineEndLabel;
    const hasData = idx !== null && lineData; // True if a line is selected

    // Update time labels
    if (startLabel) {
        startLabel.textContent = hasData ? formatTime(lineData.start) : '--:--';
    }
    if (endLabel) {
        endLabel.textContent = hasData ? formatTime(lineData.end) : '--:--';
    }

    // Enable/disable timing editor buttons based on whether a line is selected
    const editorButtons = [
        elements.setLineStartButton, elements.setLineEndButton,
        elements.nudgeStartBackButton, elements.nudgeStartForwardButton,
        elements.nudgeEndBackButton, elements.nudgeEndForwardButton,
        elements.clearLineTimesButton
    ];
    editorButtons.forEach(btn => {
        if (btn) {
            btn.disabled = !hasData;
        }
    });
}