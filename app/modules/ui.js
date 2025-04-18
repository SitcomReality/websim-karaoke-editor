// app/modules/ui.js - Facade for UI submodules

import { elements } from './ui/elements.js';
import { initLayout, updateLayoutPadding, handleSidebarStateForLayout } from './ui/layout.js';
import { displayLyrics, clearActiveLyric, highlightLyric, highlightEditingLine } from './ui/lyricsDisplay.js';
import { resetProgressBar, updateProgressBar, formatTime } from './ui/playbackDisplay.js';
import { setTimingEditorVisible, updateTimingEditorFields } from './ui/timingEditorDisplay.js';
import { updateThemeInputs } from './ui/themeDisplay.js';
import { setLoading, updateProjectName, displaySongImage } from './ui/common.js';

/**
 * Initializes core UI components like layout handling.
 */
function init() {
    initLayout(); // Initializes sidebar logic and responsive handling
    // Other initializations can be added here if needed
}

// Export all elements and functions for other modules to use
export {
    init,
    elements,
    // Layout
    initLayout,
    updateLayoutPadding,
    handleSidebarStateForLayout, // Exported for direct use if needed elsewhere, though initLayout handles setup
    // Lyrics Display
    displayLyrics,
    clearActiveLyric,
    highlightLyric,
    highlightEditingLine,
    // Playback Display
    resetProgressBar,
    updateProgressBar,
    formatTime,
    // Timing Editor Display
    setTimingEditorVisible,
    updateTimingEditorFields,
    // Theme Display
    updateThemeInputs,
    // Common UI updates
    setLoading,
    updateProjectName,
    displaySongImage
};