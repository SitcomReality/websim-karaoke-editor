// app/modules/ui/common.js
// Handles common UI updates like loading state, project title, and song image.

import { elements } from './elements.js';

/**
 * Shows or hides the loading overlay.
 * @param {boolean} isLoading - Whether to show the loading overlay.
 * @param {string} [message="Loading..."] - The message to display.
 */
export function setLoading(isLoading, message = "Loading...") {
    if (elements.loadingOverlay) {
         elements.loadingOverlay.classList.toggle('active', isLoading);
    }
    if (elements.loadingMessage) {
        elements.loadingMessage.textContent = message;
    }
}

/**
 * Updates the main song title display in the header.
 * @param {string} title - The title to display.
 */
export function updateProjectName(title) {
    if (elements.songTitle) {
        elements.songTitle.textContent = title || 'Karaoke Editor'; // Fallback title
    }
}

/**
 * Displays or hides the song image in the header.
 * @param {string|null} url - The URL of the image to display, or null/empty to hide.
 */
export function displaySongImage(url) {
    if (url) {
        elements.songImage.src = url;
        elements.songImage.style.display = '';
    } else {
        elements.songImage.src = '';
        elements.songImage.style.display = 'none';
    }
}