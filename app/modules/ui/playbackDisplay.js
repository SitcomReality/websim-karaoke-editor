// app/modules/ui/playbackDisplay.js
// Handles updating the playback progress bar, time labels, and related UI elements.

import { elements } from './ui.js';

/**
 * Resets the progress bar and time labels to their initial state (0:00).
 */
export function resetProgressBar() {
    if (elements.progressBar) {
        elements.progressBar.value = 0;
        elements.progressBar.max = 0;
    }
    if (elements.currentTimeLabel) elements.currentTimeLabel.textContent = '0:00';
    if (elements.durationLabel) elements.durationLabel.textContent = '0:00';
}

/**
 * Updates the progress bar and time labels based on current playback time and duration.
 * @param {number} [currentTime=0] - The current playback time in seconds.
 * @param {number} [duration=0] - The total duration of the audio in seconds.
 */
export function updateProgressBar(currentTime = 0, duration = 0) {
    const validDuration = (typeof duration === 'number' && !isNaN(duration) && duration > 0) ? duration : 0;
    const validCurrentTime = (typeof currentTime === 'number' && !isNaN(currentTime)) ? currentTime : 0;

    if (elements.progressBar) {
        // Ensure max is set before value, especially if duration becomes valid later
        if (elements.progressBar.max !== validDuration) {
             elements.progressBar.max = validDuration;
        }
        // Clamp value between 0 and duration
        elements.progressBar.value = Math.max(0, Math.min(validCurrentTime, validDuration));
    }
    if (elements.currentTimeLabel) elements.currentTimeLabel.textContent = formatTime(validCurrentTime);
    if (elements.durationLabel) elements.durationLabel.textContent = formatTime(validDuration);
}

/**
 * Formats a time value (seconds) into a MM:SS string.
 * @param {number|null|undefined} val - Time in seconds.
 * @returns {string} Formatted time string or "--:--" if input is invalid.
 */
export function formatTime(val) {
    if (val === null || typeof val !== 'number' || isNaN(val) || val < 0) return '--:--';
    const totalSeconds = Math.floor(val);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}